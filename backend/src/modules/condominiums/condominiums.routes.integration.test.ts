import { describe, expect, it } from "vitest";
import {
  CondominiumPermissionMode,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeCondominium, makeUser } from "../../../test/factories";

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

async function makeSyndicWithSub(
  status: SubscriptionStatus = SubscriptionStatus.ACTIVE
) {
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  await getTestPrisma().subscription.create({
    data: {
      syndicId: syndic.id,
      status,
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
// GET /api/condominiums — list (SUPER_ADMIN only)
// =====================================================
describe("condominiums — GET /api/condominiums", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/condominiums" });
    expect(res.statusCode).toBe(401);
  });

  it("403 for SYNDIC", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/condominiums",
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns list for SUPER_ADMIN", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    await makeCondominium();
    await makeCondominium();

    const res = await authedInject(app, asAuthUser(sa), {
      method: "GET",
      url: "/api/condominiums",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThanOrEqual(2);
  });
});

// =====================================================
// GET /api/condominiums/:id
// =====================================================
describe("condominiums — GET /api/condominiums/:id", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/condominiums/some-id",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns condo for linked syndic", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/condominiums/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(condo.id);
  });

  it("403 for caller without access (cross-condo isolation)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const other = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/condominiums/${other.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// POST /api/condominiums (create)
// =====================================================
describe("condominiums — POST /api/condominiums", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/condominiums",
      payload: { name: "New Condo", cnpj: "11111111111111" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403 for RESIDENT", async () => {
    const app = await getTestApp();
    const r = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(r), {
      method: "POST",
      url: "/api/condominiums",
      payload: { name: "New Condo", cnpj: "11111111111111" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("creates a condominium for SYNDIC and sets primarySyndicId + UserCondominium link", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/condominiums",
      payload: { name: "Alpha Condo", cnpj: "22222222222222" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Alpha Condo");
    expect(body.primarySyndicId).toBe(syndic.id);

    const link = await getTestPrisma().userCondominium.findFirst({
      where: { userId: syndic.id, condominiumId: body.id },
    });
    expect(link).not.toBeNull();
  });

  it("409 on duplicate CNPJ", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    await makeCondominium({ cnpj: "33333333333333" });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/condominiums",
      payload: { name: "Beta Condo", cnpj: "33333333333333" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("400/500 on invalid payload (short name)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/condominiums",
      payload: { name: "Ab", cnpj: "44444444444444" },
    });
    expect([400, 500]).toContain(res.statusCode);
  });

  it("allows multiple condominiums owned by a single syndic (N per syndic)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();

    const first = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/condominiums",
      payload: { name: "Condo One", cnpj: "55555555555551" },
    });
    expect(first.statusCode).toBe(201);

    const second = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/condominiums",
      payload: { name: "Condo Two", cnpj: "55555555555552" },
    });
    expect(second.statusCode).toBe(201);

    const count = await getTestPrisma().condominium.count({
      where: { primarySyndicId: syndic.id },
    });
    expect(count).toBe(2);
  });
});

// =====================================================
// PATCH /api/condominiums/:id (SUPER_ADMIN)
// =====================================================
describe("condominiums — PATCH /api/condominiums/:id", () => {
  it("403 for SYNDIC", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/condominiums/${condo.id}`,
      payload: { status: "SUSPENDED" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("allows SUPER_ADMIN to patch status", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const condo = await makeCondominium();

    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: `/api/condominiums/${condo.id}`,
      payload: { status: "SUSPENDED" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("SUSPENDED");
  });

  it("404 when condominium does not exist", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });

    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: "/api/condominiums/nope",
      payload: { status: "SUSPENDED" },
    });
    expect(res.statusCode).toBe(404);
  });
});

// =====================================================
// PATCH /api/condominiums/:id/settings (SYNDIC)
// =====================================================
describe("condominiums — PATCH /api/condominiums/:id/settings", () => {
  it("401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/condominiums/x/settings",
      payload: { name: "New Name" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403 for caller without access", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const other = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/condominiums/${other.id}/settings`,
      payload: { name: "Renamed" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("updates settings for the owning syndic", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/condominiums/${condo.id}/settings`,
      payload: { name: "Renamed Condo" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Renamed Condo");
  });

  it("403 for RESIDENT even if linked to condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const r = await makeUser({ role: UserRole.RESIDENT });
    await linkUserToCondo(r.id, condo.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(r), {
      method: "PATCH",
      url: `/api/condominiums/${condo.id}/settings`,
      payload: { name: "Pwned" },
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// DELETE /api/condominiums/:id (SUPER_ADMIN)
// =====================================================
describe("condominiums — DELETE /api/condominiums/:id", () => {
  it("403 for SYNDIC", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: `/api/condominiums/${condo.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("deletes an empty condominium as SUPER_ADMIN", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const condo = await makeCondominium();

    const res = await authedInject(app, asAuthUser(sa), {
      method: "DELETE",
      url: `/api/condominiums/${condo.id}`,
    });
    expect(res.statusCode).toBe(204);
    const after = await getTestPrisma().condominium.findUnique({
      where: { id: condo.id },
    });
    expect(after).toBeNull();
  });
});

// =====================================================
// GET /api/condominiums/:id/stats
// =====================================================
describe("condominiums — GET /api/condominiums/:id/stats", () => {
  it("returns stats for linked caller", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/condominiums/${condo.id}/stats`,
    });
    expect(res.statusCode).toBe(200);
  });

  it("403 for caller without access", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const other = await makeCondominium();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/condominiums/${other.id}/stats`,
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// GET /api/condominiums/:id/onboarding
// =====================================================
describe("condominiums — GET /api/condominiums/:id/onboarding", () => {
  it("returns onboarding steps for SYNDIC of the condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/condominiums/${condo.id}/onboarding`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("steps");
    expect(body).toHaveProperty("completed");
  });

  it("403 for RESIDENT", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const r = await makeUser({ role: UserRole.RESIDENT });
    await linkUserToCondo(r.id, condo.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(r), {
      method: "GET",
      url: `/api/condominiums/${condo.id}/onboarding`,
    });
    expect(res.statusCode).toBe(403);
  });
});

// =====================================================
// GET /api/condominiums/:id/syndic-profile
// =====================================================
describe("condominiums — GET /api/condominiums/:id/syndic-profile", () => {
  it("returns the syndic profile for a linked condo", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/condominiums/${condo.id}/syndic-profile`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("name");
  });

  it("404 when no syndic linked to condo", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const condo = await makeCondominium();
    await linkUserToCondo(sa.id, condo.id, UserRole.SUPER_ADMIN);

    const res = await authedInject(app, asAuthUser(sa), {
      method: "GET",
      url: `/api/condominiums/${condo.id}/syndic-profile`,
    });
    expect(res.statusCode).toBe(404);
  });
});

// =====================================================
// Membership permissions
// =====================================================
describe("condominiums — membership permissions", () => {
  it("GET permissions-catalog returns keys for SYNDIC", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/condominiums/permissions-catalog",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.keys)).toBe(true);
    expect(Array.isArray(body.sectorKeys)).toBe(true);
  });

  it("GET permissions-catalog returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const r = await makeUser({ role: UserRole.RESIDENT });

    const res = await authedInject(app, asAuthUser(r), {
      method: "GET",
      url: "/api/condominiums/permissions-catalog",
    });
    expect(res.statusCode).toBe(403);
  });

  it("GET member permissions — 404 when no link", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const target = await makeUser({ role: UserRole.ADMIN });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/condominiums/${condo.id}/members/${target.id}/permissions`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET member permissions returns effective permissions for a linked member", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const admin = await makeUser({ role: UserRole.ADMIN });
    await linkUserToCondo(admin.id, condo.id, UserRole.ADMIN);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/condominiums/${condo.id}/members/${admin.id}/permissions`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.permissionMode).toBeDefined();
    expect(Array.isArray(body.effectivePermissions)).toBe(true);
  });

  it("PUT 400 when actor == target", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PUT",
      url: `/api/condominiums/${condo.id}/members/${syndic.id}/permissions`,
      payload: {
        permissionMode: CondominiumPermissionMode.ROLE_DEFAULT,
        actions: [],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("PUT 400 when targeting a SYNDIC link (cannot customize)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const other = await makeUser({ role: UserRole.SYNDIC });
    await linkUserToCondo(other.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PUT",
      url: `/api/condominiums/${condo.id}/members/${other.id}/permissions`,
      payload: {
        permissionMode: CondominiumPermissionMode.CUSTOM,
        actions: [],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("PUT ROLE_DEFAULT clears any custom permissions", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await linkUserToCondo(syndic.id, condo.id, UserRole.SYNDIC);
    const admin = await makeUser({ role: UserRole.ADMIN });
    await linkUserToCondo(admin.id, condo.id, UserRole.ADMIN);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PUT",
      url: `/api/condominiums/${condo.id}/members/${admin.id}/permissions`,
      payload: {
        permissionMode: CondominiumPermissionMode.ROLE_DEFAULT,
        actions: [],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().permissionMode).toBe("ROLE_DEFAULT");
  });
});
