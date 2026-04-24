import { describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeCondominium,
  makeResident,
  makeUser,
} from "../../../test/factories";

setupIntegrationSuite();

const asAuthUser = (
  user: Awaited<ReturnType<typeof makeUser>>,
  opts: { permissionScope?: string } = {}
) => ({
  id: user.id,
  email: user.email,
  role: user.role as string,
  name: user.name,
  status: user.status,
  permissionScope:
    opts.permissionScope ??
    (user.role === "PROFESSIONAL_SYNDIC" ? "GLOBAL" : "LOCAL"),
});

const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400_000);

async function makeSyndicWithSub() {
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  await getTestPrisma().subscription.create({
    data: {
      syndicId: syndic.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });
  return syndic;
}

async function linkUserToCondo(
  userId: string,
  condominiumId: string,
  role: UserRole
) {
  return getTestPrisma().userCondominium.create({
    data: { userId, condominiumId, role },
  });
}

// =====================================================
// GET /api/residents/all
// =====================================================
describe("residents — GET /api/residents/all", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/residents/all" });
    expect(res.statusCode).toBe(401);
  });

  it("403 for non-global caller", async () => {
    const app = await getTestApp();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(caller), {
      method: "GET",
      url: "/api/residents/all",
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns global list for GLOBAL PROFESSIONAL_SYNDIC", async () => {
    const app = await getTestApp();
    const caller = await makeUser({ role: UserRole.PROFESSIONAL_SYNDIC });
    const condoA = await makeCondominium();
    const condoB = await makeCondominium();
    await makeResident({ condominiumId: condoA.id, name: "Alice" });
    await makeResident({ condominiumId: condoB.id, name: "Bob" });

    const res = await authedInject(
      app,
      asAuthUser(caller, { permissionScope: "GLOBAL" }),
      { method: "GET", url: "/api/residents/all" }
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });
});

// =====================================================
// GET /api/residents/:condominiumId
// =====================================================
describe("residents — GET /api/residents/:condominiumId", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/residents/some-id",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns residents for syndic of the condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    await makeResident({ condominiumId: condo.id, name: "R1" });
    await makeResident({ condominiumId: condo.id, name: "R2" });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/residents/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  it("403 when caller has no link to the condo (cross-condo isolation)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condoA = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condoA.id, UserRole.SYNDIC);
    const condoB = await makeCondominium();
    await makeResident({ condominiumId: condoB.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/residents/${condoB.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// POST /api/residents (create)
// =====================================================
describe("residents — POST /api/residents", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/residents",
      payload: { condominiumId: "c", name: "Jo", email: "a@b.c", phone: "11987654321", tower: "A", floor: "1", unit: "101" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("creates a resident when caller is SYNDIC of the condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents",
      payload: {
        condominiumId: condo.id,
        name: "New Resident",
        email: "new@test.local",
        phone: "11987654321",
        tower: "A",
        floor: "1",
        unit: "101",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("New Resident");
    expect(body.condominiumId).toBe(condo.id);
  });

  it("403 when caller has no access to the condo (cross-condo)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const myCondo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, myCondo.id, UserRole.SYNDIC);
    const otherCondo = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents",
      payload: {
        condominiumId: otherCondo.id,
        name: "Jo Doe",
        email: "jo@test.local",
        phone: "11987654321",
        tower: "A",
        floor: "1",
        unit: "101",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("400/500 on invalid payload (missing email)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents",
      payload: {
        condominiumId: condo.id,
        name: "Jo",
        phone: "11987654321",
        tower: "A",
        floor: "1",
        unit: "101",
      },
    });
    expect([400, 500]).toContain(res.statusCode);
  });

  it("409 on duplicate email in same condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    await makeResident({ condominiumId: condo.id, email: "dup@test.local", tower: "B", floor: "1", unit: "101" });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents",
      payload: {
        condominiumId: condo.id,
        name: "Other",
        email: "dup@test.local",
        phone: "11987654321",
        tower: "C",
        floor: "1",
        unit: "101",
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it("409 on occupied unit in same condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    await makeResident({ condominiumId: condo.id, tower: "A", floor: "1", unit: "101" });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents",
      payload: {
        condominiumId: condo.id,
        name: "Other",
        email: "other@test.local",
        phone: "11987654321",
        tower: "A",
        floor: "1",
        unit: "101",
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

// =====================================================
// GET /api/residents/detail/:id
// =====================================================
describe("residents — GET /api/residents/detail/:id", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/residents/detail/x",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 404 when resident not found or not accessible", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/residents/detail/nope",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns the resident for an allowed caller", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const resident = await makeResident({ condominiumId: condo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/residents/detail/${resident.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(resident.id);
  });

  it("returns 404 when resident is in another condo (isolation)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const myCondo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, myCondo.id, UserRole.SYNDIC);
    const otherCondo = await makeCondominium();
    const resident = await makeResident({ condominiumId: otherCondo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/residents/detail/${resident.id}`,
    });
    expect(res.statusCode).toBe(404);
  });
});

// =====================================================
// PATCH /api/residents/:id
// =====================================================
describe("residents — PATCH /api/residents/:id", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/residents/x",
      payload: { name: "New" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("updates the resident when caller has access", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const resident = await makeResident({ condominiumId: condo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/residents/${resident.id}`,
      payload: { name: "Updated Name" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Updated Name");
  });

  it("403 when resident belongs to another condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const myCondo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, myCondo.id, UserRole.SYNDIC);
    const otherCondo = await makeCondominium();
    const resident = await makeResident({ condominiumId: otherCondo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/residents/${resident.id}`,
      payload: { name: "Hack" },
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// PATCH /api/residents/:id/consent
// =====================================================
describe("residents — PATCH /api/residents/:id/consent", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/residents/x/consent",
      payload: { consent_whatsapp: false },
    });
    expect(res.statusCode).toBe(401);
  });

  it("updates consent when caller authed", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const resident = await makeResident({ condominiumId: condo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/residents/${resident.id}/consent`,
      payload: { consent_whatsapp: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().consentWhatsapp).toBe(false);
  });

  it("400 on empty consent body", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const resident = await makeResident({ condominiumId: condo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/residents/${resident.id}/consent`,
      payload: {},
    });
    expect([400, 500]).toContain(res.statusCode);
  });
});

// =====================================================
// DELETE /api/residents/:id
// =====================================================
describe("residents — DELETE /api/residents/:id", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/residents/x",
    });
    expect(res.statusCode).toBe(401);
  });

  it("deletes a resident without complaints", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const resident = await makeResident({ condominiumId: condo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: `/api/residents/${resident.id}`,
    });
    expect(res.statusCode).toBe(204);

    const after = await getTestPrisma().resident.findUnique({
      where: { id: resident.id },
    });
    expect(after).toBeNull();
  });

  it("403 when resident is in another condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const myCondo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, myCondo.id, UserRole.SYNDIC);
    const otherCondo = await makeCondominium();
    const other = await makeResident({ condominiumId: otherCondo.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: `/api/residents/${other.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// POST /api/residents/import
// =====================================================
describe("residents — POST /api/residents/import", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/residents/import",
      payload: {
        condominiumId: "c",
        residents: [
          { name: "A", email: "a@b.c", phone: "11987654321", tower: "A", floor: "1", unit: "1" },
        ],
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("imports multiple residents, reporting errors for duplicates", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents/import",
      payload: {
        condominiumId: condo.id,
        residents: [
          { name: "Alice", email: "alice@test.local", phone: "11987654321", tower: "A", floor: "1", unit: "101" },
          { name: "Bob", email: "bob@test.local", phone: "11987654322", tower: "A", floor: "1", unit: "101" },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.total).toBe(2);
    expect(body.imported).toHaveLength(1);
    expect(body.errors).toHaveLength(1);
  });
});

// =====================================================
// POST /api/residents/provision
// =====================================================
describe("residents — POST /api/residents/provision", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/residents/provision",
      payload: {
        condominiumId: "c",
        mode: "invite_link",
        name: "Jo",
        phone: "11987654321",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403 for caller without access to condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const other = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents/provision",
      payload: {
        condominiumId: other.id,
        mode: "invite_link",
        name: "Jo Foo",
        phone: "11987654321",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("creates an invite and returns a registerUrl", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents/provision",
      payload: {
        condominiumId: condo.id,
        mode: "invite_link",
        name: "Jo Foo",
        phone: "11987654321",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.mode).toBe("invite_link");
    expect(body.registerUrl).toContain(`/auth/register/${condo.slug}`);

    const count = await getTestPrisma().residentInvite.count({
      where: { condominiumId: condo.id },
    });
    expect(count).toBe(1);
  });

  it("409 when an active invite already exists for the same phone", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const payload = {
      condominiumId: condo.id,
      mode: "invite_link" as const,
      name: "Jo Foo",
      phone: "11987654321",
    };
    const first = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents/provision",
      payload,
    });
    expect(first.statusCode).toBe(201);

    const second = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents/provision",
      payload,
    });
    expect(second.statusCode).toBe(409);
  });

  it("400 for temp_password mode without email", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents/provision",
      payload: {
        condominiumId: condo.id,
        mode: "temp_password",
        name: "Jo Foo",
        phone: "11987654321",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("creates user + resident in temp_password mode", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/residents/provision",
      payload: {
        condominiumId: condo.id,
        mode: "temp_password",
        name: "Jo Foo",
        email: "jo.foo@test.local",
        phone: "11987654321",
        tower: "A",
        floor: "1",
        unit: "101",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.mode).toBe("temp_password");
    expect(body.userId).toBeTruthy();
    expect(body.provisionalPassword).toBeTruthy();

    const user = await getTestPrisma().user.findUnique({
      where: { id: body.userId },
    });
    expect(user?.role).toBe("RESIDENT");
    expect(user?.forcePasswordReset).toBe(true);
  });
});
