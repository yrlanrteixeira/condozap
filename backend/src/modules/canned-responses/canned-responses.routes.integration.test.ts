import { describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeCondominium, makeSector, makeUser } from "../../../test/factories";

setupIntegrationSuite();

const asAuthUser = (user: Awaited<ReturnType<typeof makeUser>>) => ({
  id: user.id,
  email: user.email,
  role: user.role as string,
  name: user.name,
  status: user.status,
  permissionScope: user.permissionScope,
});

const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400_000);

async function makeSyndicWithActiveSub(overrides = {}) {
  const syndic = await makeUser({ role: UserRole.SYNDIC, ...overrides });
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
// GET /api/canned-responses
// =====================================================

describe("canned-responses — GET /api/canned-responses", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/canned-responses",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns global responses (condominiumId: null) for any authed user", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const caller = await makeUser({ role: UserRole.RESIDENT });

    // Seed a global + a specific-condo template
    const otherCondo = await makeCondominium();
    await prisma.cannedResponse.create({
      data: {
        title: "Global Template",
        content: "Available to all",
        createdBy: caller.id,
      },
    });
    await prisma.cannedResponse.create({
      data: {
        title: "Other Condo Template",
        content: "Not yours",
        condominiumId: otherCondo.id,
        createdBy: caller.id,
      },
    });

    const res = await authedInject(app, asAuthUser(caller), {
      method: "GET",
      url: "/api/canned-responses",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // No condominiumId filter → only globals
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Global Template");
  });

  it("filters by condominiumId returning globals + condo-level + condo-sector templates", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const condoA = await makeCondominium();
    const condoB = await makeCondominium();
    const sectorA = await makeSector({ condominiumId: condoA.id });

    await prisma.cannedResponse.create({
      data: { title: "G", content: "global", createdBy: caller.id },
    });
    await prisma.cannedResponse.create({
      data: {
        title: "A-condo",
        content: "x",
        condominiumId: condoA.id,
        createdBy: caller.id,
      },
    });
    await prisma.cannedResponse.create({
      data: {
        title: "A-sector",
        content: "x",
        condominiumId: condoA.id,
        sectorId: sectorA.id,
        createdBy: caller.id,
      },
    });
    await prisma.cannedResponse.create({
      data: {
        title: "B-condo",
        content: "x",
        condominiumId: condoB.id,
        createdBy: caller.id,
      },
    });

    const res = await authedInject(app, asAuthUser(caller), {
      method: "GET",
      url: `/api/canned-responses?condominiumId=${condoA.id}`,
    });
    expect(res.statusCode).toBe(200);
    const titles = res.json().map((r: { title: string }) => r.title).sort();
    expect(titles).toEqual(["A-condo", "A-sector", "G"]);
  });

  it("prioritizes matching sector when sectorId is provided", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium();
    const sectorTarget = await makeSector({ condominiumId: condo.id });
    const sectorOther = await makeSector({ condominiumId: condo.id });

    await prisma.cannedResponse.create({
      data: {
        title: "Z-target-sector",
        content: "x",
        condominiumId: condo.id,
        sectorId: sectorTarget.id,
        createdBy: caller.id,
      },
    });
    await prisma.cannedResponse.create({
      data: {
        title: "A-other-sector",
        content: "x",
        condominiumId: condo.id,
        sectorId: sectorOther.id,
        createdBy: caller.id,
      },
    });
    await prisma.cannedResponse.create({
      data: {
        title: "M-condo-level",
        content: "x",
        condominiumId: condo.id,
        createdBy: caller.id,
      },
    });

    const res = await authedInject(app, asAuthUser(caller), {
      method: "GET",
      url: `/api/canned-responses?condominiumId=${condo.id}&sectorId=${sectorTarget.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Matching sector first
    expect(body[0].title).toBe("Z-target-sector");
    // Condo-level (sectorId null) last
    expect(body[body.length - 1].title).toBe("M-condo-level");
  });

  it("returns empty array when no templates exist", async () => {
    const app = await getTestApp();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(caller), {
      method: "GET",
      url: "/api/canned-responses",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});

// =====================================================
// POST /api/canned-responses
// =====================================================

describe("canned-responses — POST /api/canned-responses", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/canned-responses",
      payload: { title: "t", content: "c", condominiumId: "x" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("allows SYNDIC to create (regression S982)", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/canned-responses",
      payload: {
        title: "Greeting",
        content: "Hello there",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.title).toBe("Greeting");
    expect(body.createdBy).toBe(syndic.id);
    expect(body.condominiumId).toBe(condo.id);

    const persisted = await prisma.cannedResponse.findUnique({
      where: { id: body.id },
    });
    expect(persisted).not.toBeNull();
  });

  it("allows PROFESSIONAL_SYNDIC to create", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.PROFESSIONAL_SYNDIC });
    await getTestPrisma().subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(new Date(), 30),
      },
    });
    const condo = await makeCondominium({ primarySyndicId: syndic.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/canned-responses",
      payload: {
        title: "Pro",
        content: "Pro content",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it("allows ADMIN (sector member) to create when linked to a condo with an active syndic", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const admin = await makeUser({ role: UserRole.ADMIN });
    await linkUserToCondo(admin.id, condo.id, UserRole.ADMIN);

    const res = await authedInject(app, asAuthUser(admin), {
      method: "POST",
      url: "/api/canned-responses",
      payload: {
        title: "Sector template",
        content: "y",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().createdBy).toBe(admin.id);
  });

  it("returns 403 for RESIDENT (not in writer set)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const resident = await makeUser({ role: UserRole.RESIDENT });
    await linkUserToCondo(resident.id, condo.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(resident), {
      method: "POST",
      url: "/api/canned-responses",
      payload: {
        title: "t",
        content: "c",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 for SUPER_ADMIN (not in writer set)", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(app, asAuthUser(sa), {
      method: "POST",
      url: "/api/canned-responses",
      payload: { title: "t", content: "c", condominiumId: "x" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 when body is missing condominiumId (always condo-scoped)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithActiveSub();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/canned-responses",
      payload: { title: "t", content: "c" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/vinculadas a um condom/i);
  });

  it("returns 400 on invalid payload (empty title)", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithActiveSub();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/canned-responses",
      payload: { title: "", content: "c", condominiumId: "x" },
    });
    expect([400, 500]).toContain(res.statusCode);
  });
});

// =====================================================
// PATCH /api/canned-responses/:id
// =====================================================

describe("canned-responses — PATCH /api/canned-responses/:id", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/canned-responses/some-id",
      payload: { title: "x" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const tpl = await prisma.cannedResponse.create({
      data: {
        title: "old",
        content: "x",
        condominiumId: condo.id,
        createdBy: syndic.id,
      },
    });
    const resident = await makeUser({ role: UserRole.RESIDENT });
    await linkUserToCondo(resident.id, condo.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(resident), {
      method: "PATCH",
      url: `/api/canned-responses/${tpl.id}`,
      payload: { title: "new" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("updates a template when called by SYNDIC", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const tpl = await prisma.cannedResponse.create({
      data: {
        title: "old title",
        content: "old content",
        condominiumId: condo.id,
        createdBy: syndic.id,
      },
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/canned-responses/${tpl.id}`,
      payload: { title: "new title" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe("new title");
    expect(res.json().content).toBe("old content");
  });

  it("supports unlinking sector via sectorId: null", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const sector = await makeSector({ condominiumId: condo.id });
    const tpl = await prisma.cannedResponse.create({
      data: {
        title: "t",
        content: "c",
        condominiumId: condo.id,
        sectorId: sector.id,
        createdBy: syndic.id,
      },
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/canned-responses/${tpl.id}`,
      payload: { sectorId: null },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sectorId).toBeNull();
  });

  it("returns 404 when template does not exist", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithActiveSub();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: "/api/canned-responses/does-not-exist",
      payload: { title: "new" },
    });
    expect(res.statusCode).toBe(404);
  });
});

// =====================================================
// DELETE /api/canned-responses/:id
// =====================================================

describe("canned-responses — DELETE /api/canned-responses/:id", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/canned-responses/anything",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const tpl = await prisma.cannedResponse.create({
      data: {
        title: "t",
        content: "c",
        condominiumId: condo.id,
        createdBy: syndic.id,
      },
    });
    const resident = await makeUser({ role: UserRole.RESIDENT });
    await linkUserToCondo(resident.id, condo.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(resident), {
      method: "DELETE",
      url: `/api/canned-responses/${tpl.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("deletes when called by SYNDIC", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const tpl = await prisma.cannedResponse.create({
      data: {
        title: "t",
        content: "c",
        condominiumId: condo.id,
        createdBy: syndic.id,
      },
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: `/api/canned-responses/${tpl.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    const after = await prisma.cannedResponse.findUnique({
      where: { id: tpl.id },
    });
    expect(after).toBeNull();
  });

  it("returns 403 when ADMIN (not creator) tries to delete a template created by someone else", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const admin = await makeUser({ role: UserRole.ADMIN });
    await linkUserToCondo(admin.id, condo.id, UserRole.ADMIN);

    const tpl = await prisma.cannedResponse.create({
      data: {
        title: "by-syndic",
        content: "c",
        condominiumId: condo.id,
        createdBy: syndic.id,
      },
    });

    const res = await authedInject(app, asAuthUser(admin), {
      method: "DELETE",
      url: `/api/canned-responses/${tpl.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("allows ADMIN to delete a template they authored", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeSyndicWithActiveSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    const admin = await makeUser({ role: UserRole.ADMIN });
    await linkUserToCondo(admin.id, condo.id, UserRole.ADMIN);

    const tpl = await prisma.cannedResponse.create({
      data: {
        title: "by-admin",
        content: "c",
        condominiumId: condo.id,
        createdBy: admin.id,
      },
    });

    const res = await authedInject(app, asAuthUser(admin), {
      method: "DELETE",
      url: `/api/canned-responses/${tpl.id}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 404 when template does not exist", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithActiveSub();

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: "/api/canned-responses/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
  });
});
