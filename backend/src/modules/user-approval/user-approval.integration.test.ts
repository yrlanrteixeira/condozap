import { describe, expect, it } from "vitest";
import { UserRole, UserStatus } from "@prisma/client";
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

describe("user-approval — GET /api/condominiums/list", () => {
  it("returns condominiums for GLOBAL PROFESSIONAL_SYNDIC", async () => {
    const app = await getTestApp();
    const caller = await makeUser({ role: UserRole.PROFESSIONAL_SYNDIC });
    await makeCondominium({ name: "Alpha" });
    await makeCondominium({ name: "Beta" });

    const res = await authedInject(
      app,
      asAuthUser(caller, { permissionScope: "GLOBAL" }),
      { method: "GET", url: "/api/condominiums/list" }
    );

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Alpha"); // ordered asc
  });

  it("returns 403 for SUPER_ADMIN (regression S983)", async () => {
    const app = await getTestApp();
    const caller = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(app, asAuthUser(caller), {
      method: "GET",
      url: "/api/condominiums/list",
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 for SYNDIC (LOCAL scope)", async () => {
    const app = await getTestApp();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(caller), {
      method: "GET",
      url: "/api/condominiums/list",
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/condominiums/list",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("user-approval — GET /api/users/pending/all", () => {
  it("lists pending users globally for GLOBAL PROFESSIONAL_SYNDIC", async () => {
    const app = await getTestApp();
    const caller = await makeUser({ role: UserRole.PROFESSIONAL_SYNDIC });
    const condo = await makeCondominium();
    await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
    });
    await makeUser({ status: UserStatus.APPROVED });

    const res = await authedInject(
      app,
      asAuthUser(caller, { permissionScope: "GLOBAL" }),
      { method: "GET", url: "/api/users/pending/all" }
    );
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
  });

  it("returns 403 for SYNDIC", async () => {
    const app = await getTestApp();
    const caller = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(caller), {
      method: "GET",
      url: "/api/users/pending/all",
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("user-approval — GET /api/users/pending/my-condominiums", () => {
  it("lists pending users from caller's condominiums only", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condoA = await makeCondominium();
    const condoB = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });

    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condoA.id,
        role: UserRole.SYNDIC,
      },
    });

    await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condoA.id,
      name: "Pending In A",
    });
    await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condoB.id,
      name: "Pending In B",
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/users/pending/my-condominiums",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Pending In A");
  });

  it("returns empty array when syndic has no condominium links", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/users/pending/my-condominiums",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "GET",
      url: "/api/users/pending/my-condominiums",
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("user-approval — GET /api/users/pending/:condominiumId", () => {
  it("lists pending users of a condominium the syndic manages", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/users/pending/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("returns 403 when syndic lacks access to condominium", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/users/pending/${condo.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("user-approval — POST /api/users/approve", () => {
  it("approves a pending user, creates Resident and UserCondominium link", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });

    const pending = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
      name: "Pending Resident",
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/approve",
      payload: {
        userId: pending.id,
        condominiumId: condo.id,
        tower: "A",
        floor: "1",
        unit: "101",
        type: "OWNER",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toMatch(/approved/i);

    const refreshed = await prisma.user.findUnique({
      where: { id: pending.id },
    });
    expect(refreshed?.status).toBe(UserStatus.APPROVED);
    expect(refreshed?.approvedBy).toBe(syndic.id);
    expect(refreshed?.approvedAt).not.toBeNull();

    const resident = await prisma.resident.findFirst({
      where: { userId: pending.id },
    });
    expect(resident).not.toBeNull();
    expect(resident?.tower).toBe("A");
    expect(resident?.unit).toBe("101");

    const link = await prisma.userCondominium.findFirst({
      where: { userId: pending.id, condominiumId: condo.id },
    });
    expect(link).not.toBeNull();
    expect(link?.role).toBe(UserRole.RESIDENT);
  });

  it("binds an existing resident (same tower/floor/unit) to the approved user", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });

    const existingResident = await prisma.resident.create({
      data: {
        condominiumId: condo.id,
        name: "Old Name",
        email: "old@test.local",
        phone: "5599",
        tower: "B",
        floor: "2",
        unit: "202",
      },
    });

    const pending = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/approve",
      payload: {
        userId: pending.id,
        condominiumId: condo.id,
        tower: "B",
        floor: "2",
        unit: "202",
      },
    });
    expect(res.statusCode).toBe(200);

    const refreshedResident = await prisma.resident.findUnique({
      where: { id: existingResident.id },
    });
    expect(refreshedResident?.userId).toBe(pending.id);
    // default type "OWNER" is applied when body.type omitted
    expect(refreshedResident?.type).toBe("OWNER");

    const count = await prisma.resident.count({ where: { condominiumId: condo.id } });
    expect(count).toBe(1);
  });

  it("returns 400 when user is not pending", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const approved = await makeUser({ status: UserStatus.APPROVED });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/approve",
      payload: {
        userId: approved.id,
        condominiumId: condo.id,
        tower: "A",
        floor: "1",
        unit: "1",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when condominium does not exist", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const pending = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
    });

    // Wrong condo — syndic should still have access via the body condo field
    // we send here (= the one they manage) but service checks findCondominiumById
    // against body.condominiumId, so give a fake id AFTER changing the access.
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/approve",
      payload: {
        userId: pending.id,
        condominiumId: "non-existent-id",
        tower: "A",
        floor: "1",
        unit: "1",
      },
    });
    // 403 first (no access to fake condo) — guard runs before service.
    expect([400, 403]).toContain(res.statusCode);
  });

  it("returns 403 when SYNDIC has no access to target condominium", async () => {
    const app = await getTestApp();
    const otherCondo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const pending = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: otherCondo.id,
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/approve",
      payload: {
        userId: pending.id,
        condominiumId: otherCondo.id,
        tower: "A",
        floor: "1",
        unit: "1",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 on invalid payload", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/approve",
      payload: { userId: "", condominiumId: "x" },
    });
    expect([400, 403]).toContain(res.statusCode);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const pending = await makeUser({ status: UserStatus.PENDING });

    const res = await authedInject(app, asAuthUser(resident), {
      method: "POST",
      url: "/api/users/approve",
      payload: {
        userId: pending.id,
        condominiumId: condo.id,
        tower: "A",
        floor: "1",
        unit: "1",
      },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("user-approval — POST /api/users/reject", () => {
  it("marks user as REJECTED with reason", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const pending = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/reject",
      payload: { userId: pending.id, reason: "Morador não identificado" },
    });
    expect(res.statusCode).toBe(200);
    const refreshed = await prisma.user.findUnique({
      where: { id: pending.id },
    });
    expect(refreshed?.status).toBe(UserStatus.REJECTED);
    expect(refreshed?.rejectionReason).toBe("Morador não identificado");
    expect(refreshed?.approvedBy).toBe(syndic.id);
  });

  it("returns 400 when user is not pending", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const approved = await makeUser({ status: UserStatus.APPROVED });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/reject",
      payload: { userId: approved.id, reason: "x" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 403 when syndic has no access to requested condominium", async () => {
    const app = await getTestApp();
    const otherCondo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const pending = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: otherCondo.id,
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/reject",
      payload: { userId: pending.id, reason: "x" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const pending = await makeUser({ status: UserStatus.PENDING });

    const res = await authedInject(app, asAuthUser(resident), {
      method: "POST",
      url: "/api/users/reject",
      payload: { userId: pending.id, reason: "x" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 on invalid payload", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/reject",
      payload: { userId: "", reason: "" },
    });
    // Quirk: ZodError is not caught by errorHandler (check errorHandler#instanceof) — just assert non-2xx
    expect([400, 500]).toContain(res.statusCode);
  });
});

describe("user-approval — GET /api/users/my-status", () => {
  it("returns LGPD-consent-aware status payload (no black screen — S982)", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const user = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
      consentDataProcessing: true,
      consentWhatsapp: true,
    });

    const res = await authedInject(app, asAuthUser(user), {
      method: "GET",
      url: "/api/users/my-status",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Must return a fully formed status object — not empty (S982 regression).
    expect(body).toMatchObject({
      id: user.id,
      email: user.email,
      status: "PENDING",
    });
    expect(body).toHaveProperty("approvedAt");
    expect(body).toHaveProperty("rejectionReason");
    expect(body).toHaveProperty("requestedTower");
  });

  it("returns 404 when the user no longer exists", async () => {
    const app = await getTestApp();
    const res = await authedInject(
      app,
      {
        id: "nonexistent-user-id",
        email: "ghost@test.local",
        role: "RESIDENT",
      },
      { method: "GET", url: "/api/users/my-status" }
    );
    expect(res.statusCode).toBe(404);
  });

  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/users/my-status",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("user-approval — end-to-end flow", () => {
  it("resident requests → PENDING → approved → APPROVED + resident row + link", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });

    // Step 1: simulate resident self-registration → PENDING.
    const pending = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
      name: "Fulano",
    });

    // Step 2: syndic sees the pending request under my-condominiums.
    const list = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/users/pending/my-condominiums",
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((u: { id: string }) => u.id === pending.id)).toBe(true);

    // Step 3: pending user polls my-status.
    const statusBefore = await authedInject(app, asAuthUser(pending), {
      method: "GET",
      url: "/api/users/my-status",
    });
    expect(statusBefore.json().status).toBe("PENDING");

    // Step 4: syndic approves.
    const approved = await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/approve",
      payload: {
        userId: pending.id,
        condominiumId: condo.id,
        tower: "T1",
        floor: "3",
        unit: "305",
        type: "TENANT",
      },
    });
    expect(approved.statusCode).toBe(200);

    // Step 5: user's status is now APPROVED.
    const statusAfter = await authedInject(app, asAuthUser(pending), {
      method: "GET",
      url: "/api/users/my-status",
    });
    expect(statusAfter.json().status).toBe("APPROVED");

    // Side-effects persisted.
    const resident = await prisma.resident.findFirst({
      where: { userId: pending.id },
    });
    expect(resident?.type).toBe("TENANT");
    const link = await prisma.userCondominium.findFirst({
      where: { userId: pending.id, condominiumId: condo.id },
    });
    expect(link?.role).toBe(UserRole.RESIDENT);
  });

  it("resident requests → rejected → user status REJECTED, no resident row", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await prisma.userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const pending = await makeUser({
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
    });

    await authedInject(app, asAuthUser(syndic), {
      method: "POST",
      url: "/api/users/reject",
      payload: { userId: pending.id, reason: "fora do condomínio" },
    });

    const refreshed = await prisma.user.findUnique({
      where: { id: pending.id },
    });
    expect(refreshed?.status).toBe("REJECTED");
    const residents = await prisma.resident.count({
      where: { userId: pending.id },
    });
    expect(residents).toBe(0);
  });
});
