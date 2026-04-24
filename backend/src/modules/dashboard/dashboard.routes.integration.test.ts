import { describe, expect, it } from "vitest";
import {
  ComplaintPriority,
  ComplaintStatus,
  PermissionScope,
  UserRole,
  UserStatus,
} from "@prisma/client";
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

describe("dashboard — GET /api/dashboard/metrics/all", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/dashboard/metrics/all" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for non PROFESSIONAL_SYNDIC role", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/dashboard/metrics/all",
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 for PROFESSIONAL_SYNDIC without GLOBAL scope", async () => {
    const app = await getTestApp();
    const u = await makeUser({
      role: UserRole.PROFESSIONAL_SYNDIC,
      permissionScope: PermissionScope.LOCAL,
    });
    const res = await authedInject(app, asAuthUser(u), {
      method: "GET",
      url: "/api/dashboard/metrics/all",
    });
    expect(res.statusCode).toBe(403);
  });

  it("aggregates metrics for PROFESSIONAL_SYNDIC w/ GLOBAL scope", async () => {
    const app = await getTestApp();
    const psy = await makeUser({
      role: UserRole.PROFESSIONAL_SYNDIC,
      permissionScope: PermissionScope.GLOBAL,
    });
    const condo = await makeCondominium();
    const resident = await makeResident({ condominiumId: condo.id });
    await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      status: ComplaintStatus.NEW,
      priority: ComplaintPriority.HIGH,
    });
    await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      status: ComplaintStatus.RESOLVED,
      priority: ComplaintPriority.LOW,
    });

    const res = await authedInject(app, asAuthUser(psy), {
      method: "GET",
      url: "/api/dashboard/metrics/all",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.complaints.total).toBeGreaterThanOrEqual(2);
    expect(body.complaints.byPriority.HIGH).toBeGreaterThanOrEqual(1);
    expect(body.residents.total).toBeGreaterThanOrEqual(1);
  });
});

describe("dashboard — GET /api/dashboard/metrics/:condominiumId", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/dashboard/metrics/some-id",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 when user has no membership to condo", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const other = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(other), {
      method: "GET",
      url: `/api/dashboard/metrics/${condo.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns metrics for member of the condo", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const user = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium({ primarySyndicId: user.id });
    await prisma.userCondominium.create({
      data: { userId: user.id, condominiumId: condo.id, role: UserRole.SYNDIC },
    });
    const resident = await makeResident({ condominiumId: condo.id });
    await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      status: ComplaintStatus.NEW,
    });

    const res = await authedInject(app, asAuthUser(user), {
      method: "GET",
      url: `/api/dashboard/metrics/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().complaints.total).toBeGreaterThanOrEqual(1);
  });
});

describe("dashboard — GET /api/dashboard/unified", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/dashboard/unified?condominiumIds=x",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when condominiumIds is empty string", async () => {
    const app = await getTestApp();
    const psy = await makeUser({
      role: UserRole.PROFESSIONAL_SYNDIC,
      permissionScope: PermissionScope.GLOBAL,
    });
    // zod requires min(1) → any non-empty gets past; empty → 500 due to parse
    const res = await authedInject(app, asAuthUser(psy), {
      method: "GET",
      url: "/api/dashboard/unified?condominiumIds=,,,",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns dashboard for allowed condos (GLOBAL)", async () => {
    const app = await getTestApp();
    const psy = await makeUser({
      role: UserRole.PROFESSIONAL_SYNDIC,
      permissionScope: PermissionScope.GLOBAL,
    });
    const c1 = await makeCondominium();
    const c2 = await makeCondominium();
    const r1 = await makeResident({ condominiumId: c1.id });
    await makeComplaint({
      condominiumId: c1.id,
      residentId: r1.id,
      priority: ComplaintPriority.CRITICAL,
      status: ComplaintStatus.NEW,
    });

    const res = await authedInject(app, asAuthUser(psy), {
      method: "GET",
      url: `/api/dashboard/unified?condominiumIds=${c1.id},${c2.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalCondos).toBe(2);
    expect(body.criticalComplaints).toBeGreaterThanOrEqual(1);
  });
});

describe("dashboard — GET /api/dashboard/actionable/:condominiumId", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/dashboard/actionable/x",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "GET",
      url: `/api/dashboard/actionable/${condo.id}`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns actionable dashboard for SYNDIC member", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await prisma.userCondominium.create({
      data: { userId: syndic.id, condominiumId: condo.id, role: UserRole.SYNDIC },
    });

    // Pending approval
    await makeUser({
      role: UserRole.RESIDENT,
      status: UserStatus.PENDING,
      requestedCondominiumId: condo.id,
    });

    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/dashboard/actionable/${condo.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("slaAtRisk");
    expect(body).toHaveProperty("pendingApprovals");
    expect(body.pendingApprovals.count).toBeGreaterThanOrEqual(1);
    expect(body).toHaveProperty("csatSummary");
    expect(body).toHaveProperty("resolutionStats");
    expect(body).toHaveProperty("weeklyTrend");
  });
});
