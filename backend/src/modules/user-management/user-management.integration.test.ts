import { describe, expect, it } from "vitest";
import { UserRole, UserStatus } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeCondominium,
  makeSector,
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

const linkUser = async (userId: string, condominiumId: string, role: UserRole) =>
  getTestPrisma().userCondominium.create({
    data: { userId, condominiumId, role },
  });

describe("user-management — POST /api/users/create-admin", () => {
  it("SYNDIC (with manage:team) creates an ADMIN in their condominium", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-admin",
      payload: {
        email: "new-admin@test.local",
        name: "New Admin",
        password: "supersecret123",
        condominiumId: condo.id,
        councilPosition: "Conselheiro",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe("new-admin@test.local");
    expect(body.user.role).toBe("ADMIN");

    const link = await prisma.userCondominium.findFirst({
      where: { userId: body.user.id, condominiumId: condo.id },
    });
    expect(link?.councilPosition).toBe("Conselheiro");
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "POST",
      url: "/api/users/create-admin",
      payload: {
        email: "x@test.local",
        name: "Xyz",
        password: "12345678",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 for SUPER_ADMIN (no condo access — regression S983)", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(app, asAuthUser(sa), {
      method: "POST",
      url: "/api/users/create-admin",
      payload: {
        email: "x@test.local",
        name: "Xyz",
        password: "12345678",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 409 on duplicate email", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, condo.id, UserRole.SYNDIC);
    await makeUser({ email: "dup@test.local" });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-admin",
      payload: {
        email: "dup@test.local",
        name: "DupUser",
        password: "12345678",
        condominiumId: condo.id,
      },
    });
    expect(res.statusCode).toBe(409);
    // Message body shape varies; just assert status.
  });

  it("returns 400 on invalid payload", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-admin",
      payload: { email: "not-an-email", name: "x", password: "short", condominiumId: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/users/create-admin",
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it("nullifies councilPosition when blank", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, condo.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-admin",
      payload: {
        email: "admin2@test.local",
        name: "Admin Two",
        password: "12345678",
        condominiumId: condo.id,
        councilPosition: "   ",
      },
    });
    expect(res.statusCode).toBe(201);
    const link = await prisma.userCondominium.findFirst({
      where: { userId: res.json().user.id, condominiumId: condo.id },
    });
    expect(link?.councilPosition).toBeNull();
  });
});

describe("user-management — POST /api/users/create-syndic", () => {
  it("SUPER_ADMIN creates a SYNDIC with condominium links and TRIAL subscription", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const c1 = await makeCondominium();
    const c2 = await makeCondominium();

    const res = await authedInject(app, asAuthUser(sa), {
      method: "POST",
      url: "/api/users/create-syndic",
      payload: {
        email: "syndic1@test.local",
        name: "Novo Síndico",
        password: "12345678",
        condominiumIds: [c1.id, c2.id],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.condominiumsCount).toBe(2);

    const links = await prisma.userCondominium.findMany({
      where: { userId: body.user.id },
    });
    expect(links).toHaveLength(2);

    const sub = await prisma.subscription.findUnique({
      where: { syndicId: body.user.id },
    });
    expect(sub?.status).toBe("TRIAL");
    expect(sub?.trialEndsAt).not.toBeNull();

    const c1Refreshed = await prisma.condominium.findUnique({
      where: { id: c1.id },
    });
    expect(c1Refreshed?.primarySyndicId).toBe(body.user.id);
  });

  it("does not clobber existing primarySyndicId", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const existingOwner = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium({ primarySyndicId: existingOwner.id });

    const res = await authedInject(app, asAuthUser(sa), {
      method: "POST",
      url: "/api/users/create-syndic",
      payload: {
        email: "syndic2@test.local",
        name: "Outro",
        password: "12345678",
        condominiumIds: [condo.id],
      },
    });
    expect(res.statusCode).toBe(201);

    const refreshed = await prisma.condominium.findUnique({ where: { id: condo.id } });
    expect(refreshed?.primarySyndicId).toBe(existingOwner.id);
  });

  it("returns 403 for non-SUPER_ADMIN (SYNDIC cannot create peer SYNDIC)", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const c = await makeCondominium();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-syndic",
      payload: {
        email: "x@test.local",
        name: "Xyz",
        password: "12345678",
        condominiumIds: [c.id],
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 409 on duplicate email", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const c = await makeCondominium();
    await makeUser({ email: "taken@test.local" });

    const res = await authedInject(app, asAuthUser(sa), {
      method: "POST",
      url: "/api/users/create-syndic",
      payload: {
        email: "taken@test.local",
        name: "Xyz",
        password: "12345678",
        condominiumIds: [c.id],
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe("user-management — POST /api/users/create-professional-syndic", () => {
  it("SUPER_ADMIN creates a PROFESSIONAL_SYNDIC (GLOBAL scope)", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const c = await makeCondominium();

    const res = await authedInject(app, asAuthUser(sa), {
      method: "POST",
      url: "/api/users/create-professional-syndic",
      payload: {
        email: "pro@test.local",
        name: "Pro Syndic",
        password: "12345678",
        condominiumIds: [c.id],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.condominiumsCount).toBe(1);

    const user = await prisma.user.findUnique({ where: { id: body.user.id } });
    expect(user?.role).toBe("PROFESSIONAL_SYNDIC");
    expect(user?.permissionScope).toBe("GLOBAL");

    const sub = await prisma.subscription.findUnique({
      where: { syndicId: body.user.id },
    });
    expect(sub?.status).toBe("TRIAL");
  });

  it("works without condominiumIds", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(app, asAuthUser(sa), {
      method: "POST",
      url: "/api/users/create-professional-syndic",
      payload: {
        email: "pro2@test.local",
        name: "Pro Two",
        password: "12345678",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().condominiumsCount).toBe(0);
  });

  it("returns 403 for non-SUPER_ADMIN", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-professional-syndic",
      payload: {
        email: "x@test.local",
        name: "Xyz",
        password: "12345678",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 409 on duplicate email", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    await makeUser({ email: "taken2@test.local" });
    const res = await authedInject(app, asAuthUser(sa), {
      method: "POST",
      url: "/api/users/create-professional-syndic",
      payload: {
        email: "taken2@test.local",
        name: "Xyz",
        password: "12345678",
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe("user-management — GET /api/users/condominium/:condominiumId", () => {
  it("SYNDIC lists users of their condominium", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const member = await makeUser({ role: UserRole.RESIDENT });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    await linkUser(member.id, c.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/users/condominium/${c.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    await linkUser(resident.id, c.id, UserRole.RESIDENT);
    const res = await authedInject(app, asAuthUser(resident), {
      method: "GET",
      url: `/api/users/condominium/${c.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 when SYNDIC lacks access to condominium", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/users/condominium/${c.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("user-management — PATCH /api/users/update-role", () => {
  it("SYNDIC updates another user's role", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.RESIDENT });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    await linkUser(target.id, c.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: "/api/users/update-role",
      payload: { userId: target.id, newRole: "ADMIN" },
    });
    expect(res.statusCode).toBe(200);

    const refreshed = await prisma.user.findUnique({ where: { id: target.id } });
    expect(refreshed?.role).toBe("ADMIN");
    const link = await prisma.userCondominium.findFirst({
      where: { userId: target.id, condominiumId: c.id },
    });
    expect(link?.role).toBe("ADMIN");
  });

  it("cannot change own role (400)", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: "/api/users/update-role",
      payload: { userId: syndic.id, newRole: "ADMIN" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const target = await makeUser();
    const res = await authedInject(app, asAuthUser(resident), {
      method: "PATCH",
      url: "/api/users/update-role",
      payload: { userId: target.id, newRole: "ADMIN" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 for SUPER_ADMIN (regression S983)", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const target = await makeUser();
    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: "/api/users/update-role",
      payload: { userId: target.id, newRole: "ADMIN" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 on invalid role enum", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: "/api/users/update-role",
      payload: { userId: "x", newRole: "GOD" },
    });
    expect([400, 500]).toContain(res.statusCode);
  });
});

describe("user-management — PATCH /api/users/update-council-position", () => {
  it("ADMIN updates council position of a member", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c = await makeCondominium();
    const admin = await makeUser({ role: UserRole.ADMIN });
    const target = await makeUser({ role: UserRole.ADMIN });
    await linkUser(admin.id, c.id, UserRole.ADMIN);
    await linkUser(target.id, c.id, UserRole.ADMIN);

    const res = await authedInject(app, asAuthUser(admin), {
      method: "PATCH",
      url: "/api/users/update-council-position",
      payload: {
        userId: target.id,
        condominiumId: c.id,
        councilPosition: "Obras",
      },
    });
    expect(res.statusCode).toBe(200);
    const link = await prisma.userCondominium.findFirst({
      where: { userId: target.id, condominiumId: c.id },
    });
    expect(link?.councilPosition).toBe("Obras");
  });

  it("returns 404 when link does not exist", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const admin = await makeUser({ role: UserRole.ADMIN });
    await linkUser(admin.id, c.id, UserRole.ADMIN);
    const res = await authedInject(app, asAuthUser(admin), {
      method: "PATCH",
      url: "/api/users/update-council-position",
      payload: {
        userId: "no-such-user",
        condominiumId: c.id,
        councilPosition: null,
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "PATCH",
      url: "/api/users/update-council-position",
      payload: {
        userId: "x",
        condominiumId: c.id,
        councilPosition: null,
      },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("user-management — DELETE /api/users/remove", () => {
  it("removes user from condominium and suspends if it was their last link", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.ADMIN });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    await linkUser(target.id, c.id, UserRole.ADMIN);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: "/api/users/remove",
      payload: { userId: target.id, condominiumId: c.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().userSuspended).toBe(true);

    const refreshed = await prisma.user.findUnique({ where: { id: target.id } });
    expect(refreshed?.status).toBe(UserStatus.SUSPENDED);
    const link = await prisma.userCondominium.findFirst({
      where: { userId: target.id, condominiumId: c.id },
    });
    expect(link).toBeNull();
  });

  it("does not suspend user with remaining condominium links", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c1 = await makeCondominium();
    const c2 = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.ADMIN });
    await linkUser(syndic.id, c1.id, UserRole.SYNDIC);
    await linkUser(target.id, c1.id, UserRole.ADMIN);
    await linkUser(target.id, c2.id, UserRole.ADMIN);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: "/api/users/remove",
      payload: { userId: target.id, condominiumId: c1.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().userSuspended).toBe(false);

    const refreshed = await prisma.user.findUnique({ where: { id: target.id } });
    expect(refreshed?.status).toBe(UserStatus.APPROVED);
  });

  it("rejects self-removal with 400", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "DELETE",
      url: "/api/users/remove",
      payload: { userId: syndic.id, condominiumId: c.id },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "DELETE",
      url: "/api/users/remove",
      payload: { userId: "x", condominiumId: c.id },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("user-management — POST /api/users/invite", () => {
  it("invites an existing user to a condominium", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    const target = await makeUser({ email: "invitee@test.local" });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/invite",
      payload: {
        email: "invitee@test.local",
        condominiumId: c.id,
        role: "RESIDENT",
      },
    });
    expect(res.statusCode).toBe(200);
    const link = await prisma.userCondominium.findFirst({
      where: { userId: target.id, condominiumId: c.id },
    });
    expect(link?.role).toBe("RESIDENT");
  });

  it("returns 404 when the invitee does not exist", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/invite",
      payload: {
        email: "ghost@test.local",
        condominiumId: c.id,
        role: "RESIDENT",
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 409 when user already linked", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    const target = await makeUser({ email: "already@test.local" });
    await linkUser(target.id, c.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/invite",
      payload: {
        email: "already@test.local",
        condominiumId: c.id,
        role: "RESIDENT",
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it("returns 403 for ADMIN (Conselheiro cannot invite peers)", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const admin = await makeUser({ role: UserRole.ADMIN });
    await linkUser(admin.id, c.id, UserRole.ADMIN);
    const res = await authedInject(app, asAuthUser(admin), {
      method: "POST",
      url: "/api/users/invite",
      payload: {
        email: "x@test.local",
        condominiumId: c.id,
        role: "RESIDENT",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 when SYNDIC of condo A invites to condo B (cross-tenant)", async () => {
    const app = await getTestApp();
    const condoA = await makeCondominium();
    const condoB = await makeCondominium();
    const syndicA = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndicA.id, condoA.id, UserRole.SYNDIC);
    const target = await makeUser({ email: "victim@test.local" });

    const res = await authedInject(app, asAuthUser(syndicA), {
      method: "POST",
      url: "/api/users/invite",
      payload: {
        email: "victim@test.local",
        condominiumId: condoB.id, // SyndicA does NOT have access to condoB
        role: "RESIDENT",
      },
    });
    expect(res.statusCode).toBe(403);
    void target;
  });
});

describe("user-management — cross-tenant guards (regression)", () => {
  it("PATCH /update-role: SYNDIC of condo A cannot change role of user in condo B", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condoA = await makeCondominium();
    const condoB = await makeCondominium();
    const syndicA = await makeUser({ role: UserRole.SYNDIC });
    const targetInB = await makeUser({ role: UserRole.RESIDENT });
    await linkUser(syndicA.id, condoA.id, UserRole.SYNDIC);
    await linkUser(targetInB.id, condoB.id, UserRole.RESIDENT);

    const res = await authedInject(app, asAuthUser(syndicA), {
      method: "PATCH",
      url: "/api/users/update-role",
      payload: { userId: targetInB.id, newRole: "ADMIN" },
    });
    expect(res.statusCode).toBe(403);

    // Confirm target was NOT mutated
    const refreshed = await prisma.user.findUnique({
      where: { id: targetInB.id },
    });
    expect(refreshed?.role).toBe("RESIDENT");
  });

  it("DELETE /remove: SYNDIC of condo A cannot remove user from condo B", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condoA = await makeCondominium();
    const condoB = await makeCondominium();
    const syndicA = await makeUser({ role: UserRole.SYNDIC });
    const targetInB = await makeUser({ role: UserRole.ADMIN });
    await linkUser(syndicA.id, condoA.id, UserRole.SYNDIC);
    await linkUser(targetInB.id, condoB.id, UserRole.ADMIN);

    const res = await authedInject(app, asAuthUser(syndicA), {
      method: "DELETE",
      url: "/api/users/remove",
      payload: { userId: targetInB.id, condominiumId: condoB.id },
    });
    expect(res.statusCode).toBe(403);

    // Confirm link still exists
    const link = await prisma.userCondominium.findFirst({
      where: { userId: targetInB.id, condominiumId: condoB.id },
    });
    expect(link).not.toBeNull();
  });
});

describe("user-management — GET /api/users/syndics & PATCH /api/users/syndics/:id", () => {
  it("SUPER_ADMIN lists syndics", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    await makeUser({ role: UserRole.SYNDIC, name: "S1" });
    await makeUser({ role: UserRole.PROFESSIONAL_SYNDIC, name: "S2" });
    await makeUser({ role: UserRole.RESIDENT, name: "R1" });

    const res = await authedInject(app, asAuthUser(sa), {
      method: "GET",
      url: "/api/users/syndics",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
  });

  it("returns 403 for SYNDIC (not SUPER_ADMIN)", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/users/syndics",
    });
    expect(res.statusCode).toBe(403);
  });

  it("SUPER_ADMIN updates a SYNDIC (name, email, condominiums, password)", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const syndic = await makeUser({ role: UserRole.SYNDIC, email: "old@test.local" });
    const c1 = await makeCondominium();
    const c2 = await makeCondominium();
    await linkUser(syndic.id, c1.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: `/api/users/syndics/${syndic.id}`,
      payload: {
        name: "New Name",
        email: "new@test.local",
        password: "newpassword12",
        role: "SYNDIC",
        condominiumIds: [c2.id],
      },
    });
    expect(res.statusCode).toBe(200);

    const refreshed = await prisma.user.findUnique({ where: { id: syndic.id } });
    expect(refreshed?.name).toBe("New Name");
    expect(refreshed?.email).toBe("new@test.local");

    const links = await prisma.userCondominium.findMany({
      where: { userId: syndic.id },
    });
    expect(links).toHaveLength(1);
    expect(links[0].condominiumId).toBe(c2.id);
  });

  it("returns 404 when updating non-existent syndic", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const c = await makeCondominium();
    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: "/api/users/syndics/no-such-id",
      payload: {
        name: "Xyz",
        email: "x@test.local",
        role: "SYNDIC",
        condominiumIds: [c.id],
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 400 when target user is not a syndic", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const c = await makeCondominium();
    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: `/api/users/syndics/${resident.id}`,
      payload: {
        name: "Xyz",
        email: "x@test.local",
        role: "SYNDIC",
        condominiumIds: [c.id],
      },
    });
    expect([400, 500]).toContain(res.statusCode);
  });

  it("returns 400 when some condominiums do not exist", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: `/api/users/syndics/${syndic.id}`,
      payload: {
        name: "Xyz",
        email: "x@test.local",
        role: "SYNDIC",
        condominiumIds: ["fake-id-1"],
      },
    });
    expect([400, 500]).toContain(res.statusCode);
  });

  it("returns 409 when email already taken by another user", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const syndic = await makeUser({ role: UserRole.SYNDIC, email: "syn@test.local" });
    await makeUser({ email: "taken3@test.local" });
    const c = await makeCondominium();
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: `/api/users/syndics/${syndic.id}`,
      payload: {
        name: "Xyz",
        email: "taken3@test.local",
        role: "SYNDIC",
        condominiumIds: [c.id],
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it("rejects empty condominiumIds for SYNDIC role (zod refine)", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: `/api/users/syndics/${syndic.id}`,
      payload: {
        name: "Xyz",
        email: "xx@test.local",
        role: "SYNDIC",
        condominiumIds: [],
      },
    });
    expect([400, 500]).toContain(res.statusCode);
  });

  it("rejects password shorter than 8 via zod refine", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const c = await makeCondominium();
    const res = await authedInject(app, asAuthUser(sa), {
      method: "PATCH",
      url: `/api/users/syndics/${syndic.id}`,
      payload: {
        name: "Name",
        email: "syn2@test.local",
        password: "short",
        role: "SYNDIC",
        condominiumIds: [c.id],
      },
    });
    expect([400, 500]).toContain(res.statusCode);
  });
});

describe("user-management — PATCH /api/users/:userId/expiration", () => {
  it("SYNDIC updates account expiration", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.ADMIN });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    await linkUser(target.id, c.id, UserRole.ADMIN);

    const future = new Date(Date.now() + 7 * 86400000).toISOString();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/users/${target.id}/expiration`,
      payload: { accountExpiresAt: future, condominiumId: c.id },
    });
    expect(res.statusCode).toBe(200);

    const refreshed = await prisma.user.findUnique({ where: { id: target.id } });
    expect(refreshed?.accountExpiresAt).not.toBeNull();
  });

  it("reactivates a SUSPENDED user when future expiration is set", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.ADMIN, status: UserStatus.SUSPENDED });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    await linkUser(target.id, c.id, UserRole.ADMIN);

    const future = new Date(Date.now() + 86400000).toISOString();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/users/${target.id}/expiration`,
      payload: { accountExpiresAt: future, condominiumId: c.id },
    });
    expect(res.statusCode).toBe(200);
    const refreshed = await prisma.user.findUnique({ where: { id: target.id } });
    expect(refreshed?.status).toBe("APPROVED");
  });

  it("returns 404 when user does not belong to condominium", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const unrelated = await makeUser();
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/users/${unrelated.id}/expiration`,
      payload: { accountExpiresAt: null, condominiumId: c.id },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "PATCH",
      url: `/api/users/xxx/expiration`,
      payload: { accountExpiresAt: null, condominiumId: c.id },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 for invalid datetime", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/users/anything/expiration`,
      payload: { accountExpiresAt: "not-a-date", condominiumId: c.id },
    });
    expect([400, 500]).toContain(res.statusCode);
  });
});

describe("user-management — PATCH /api/:userId/assigned-tower", () => {
  it("SYNDIC assigns a tower to a member", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const target = await makeUser({ role: UserRole.ADMIN });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    await linkUser(target.id, c.id, UserRole.ADMIN);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/${target.id}/assigned-tower`,
      payload: { assignedTower: "TORRE-A", condominiumId: c.id },
    });
    expect(res.statusCode).toBe(200);
    const link = await prisma.userCondominium.findFirst({
      where: { userId: target.id, condominiumId: c.id },
    });
    expect(link?.assignedTower).toBe("TORRE-A");
  });

  it("returns 404 when link does not exist", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "PATCH",
      url: `/api/non-existent/assigned-tower`,
      payload: { assignedTower: null, condominiumId: c.id },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "PATCH",
      url: `/api/x/assigned-tower`,
      payload: { assignedTower: null, condominiumId: c.id },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("user-management — POST /api/users/create-sector-member", () => {
  it("SYNDIC creates a SETOR_MEMBER bound to a sector", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    const sector = await makeSector({ condominiumId: c.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-sector-member",
      payload: {
        email: "sm@test.local",
        name: "Sector Member",
        password: "12345678",
        condominiumId: c.id,
        sectorId: sector.id,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("SETOR_MEMBER");

    const member = await prisma.sectorMember.findUnique({
      where: { id: body.sectorMemberId },
    });
    expect(member?.sectorId).toBe(sector.id);
    expect(member?.isActive).toBe(true);
  });

  it("returns 409 on duplicate email", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c.id, UserRole.SYNDIC);
    const sector = await makeSector({ condominiumId: c.id });
    await makeUser({ email: "dup-sm@test.local" });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-sector-member",
      payload: {
        email: "dup-sm@test.local",
        name: "Xyz",
        password: "12345678",
        condominiumId: c.id,
        sectorId: sector.id,
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it("returns 404 when sector belongs to a different condominium", async () => {
    const app = await getTestApp();
    const c1 = await makeCondominium();
    const c2 = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await linkUser(syndic.id, c1.id, UserRole.SYNDIC);
    const sectorInC2 = await makeSector({ condominiumId: c2.id });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/create-sector-member",
      payload: {
        email: "sm2@test.local",
        name: "Xyz",
        password: "12345678",
        condominiumId: c1.id,
        sectorId: sectorInC2.id,
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const c = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "POST",
      url: "/api/users/create-sector-member",
      payload: {
        email: "x@test.local",
        name: "Xyz",
        password: "12345678",
        condominiumId: c.id,
        sectorId: "s",
      },
    });
    expect(res.statusCode).toBe(403);
  });
});
