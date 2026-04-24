import { describe, expect, it } from "vitest";
import { ComplaintStatus, PermissionScope, UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeComplaint,
  makeCondominium,
  makeResident,
  makeUser,
} from "../../../test/factories";

setupIntegrationSuite();

const asAuthUser = (user: Awaited<ReturnType<typeof makeUser>>) => ({
  id: user.id,
  email: user.email,
  role: user.role as string,
  name: user.name,
  status: user.status,
  permissionScope: user.permissionScope,
});

async function seedComplaintWithHistory(condominiumId: string) {
  const prisma = getTestPrisma();
  const resident = await makeResident({ condominiumId });
  const complaint = await makeComplaint({
    condominiumId,
    residentId: resident.id,
    status: ComplaintStatus.IN_PROGRESS,
  });
  const log = await prisma.complaintStatusHistory.create({
    data: {
      complaintId: complaint.id,
      fromStatus: ComplaintStatus.NEW,
      toStatus: ComplaintStatus.IN_PROGRESS,
      changedBy: "system",
      action: "STATUS_CHANGE",
      notes: "Aberta",
    },
  });
  return { complaint, log };
}

describe("history — GET /api/history/all", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/history/all" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for non PROFESSIONAL_SYNDIC", async () => {
    const app = await getTestApp();
    const user = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(user), {
      method: "GET",
      url: "/api/history/all",
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns all logs for GLOBAL PROFESSIONAL_SYNDIC", async () => {
    const app = await getTestApp();
    const psy = await makeUser({
      role: UserRole.PROFESSIONAL_SYNDIC,
      permissionScope: PermissionScope.GLOBAL,
    });
    const condo = await makeCondominium();
    await seedComplaintWithHistory(condo.id);

    const res = await authedInject(app, asAuthUser(psy), {
      method: "GET",
      url: "/api/history/all",
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
    expect(res.json().length).toBeGreaterThanOrEqual(1);
  });
});

describe("history — GET /api/history/:condominiumId", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/history/some-condo",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when user has no access to the condominium", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const user = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(user), {
      method: "GET",
      url: `/api/history/${condo.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns history logs for members", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await prisma.userCondominium.create({
      data: { userId: syndic.id, condominiumId: condo.id, role: UserRole.SYNDIC },
    });
    await seedComplaintWithHistory(condo.id);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/history/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThanOrEqual(1);
  });
});

describe("history — GET /api/history/logs/:logId", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/history/logs/fake-id",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 404 when log not found", async () => {
    const app = await getTestApp();
    const user = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(user), {
      method: "GET",
      url: "/api/history/logs/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 403 when caller has no access to log's condominium", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const { log } = await seedComplaintWithHistory(condo.id);
    const outsider = await makeUser({ role: UserRole.SYNDIC });

    const res = await authedInject(app, asAuthUser(outsider), {
      method: "GET",
      url: `/api/history/logs/${log.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns the log for allowed caller", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await prisma.userCondominium.create({
      data: { userId: syndic.id, condominiumId: condo.id, role: UserRole.SYNDIC },
    });
    const { log } = await seedComplaintWithHistory(condo.id);

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/history/logs/${log.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(log.id);
  });
});

describe("history — GET /api/history/activity/:condominiumId", () => {
  // activity_logs table does not exist in test DB (schema.prisma has it but no migration).
  // See TODO in plan: skip until migration created.
  it.skip("returns activity logs for member (TODO: activity_logs migration missing)", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await prisma.userCondominium.create({
      data: { userId: syndic.id, condominiumId: condo.id, role: UserRole.SYNDIC },
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/history/activity/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 403 when caller is outside condo", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const outsider = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(outsider), {
      method: "GET",
      url: `/api/history/activity/${condo.id}`,
    });
    expect(res.statusCode).toBe(403);
  });
});
