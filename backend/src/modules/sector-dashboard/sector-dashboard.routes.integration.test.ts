import { describe, expect, it } from "vitest";
import { ComplaintStatus, UserRole } from "@prisma/client";
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
  makeSector,
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

async function setupSectorMember() {
  const prisma = getTestPrisma();
  const user = await makeUser({ role: "SETOR_MEMBER" as UserRole });
  const condo = await makeCondominium();
  const sector = await makeSector({ condominiumId: condo.id });
  await prisma.sectorMember.create({
    data: { userId: user.id, sectorId: sector.id, isActive: true },
  });
  return { user, condo, sector };
}

describe("sector-dashboard — GET /api/sector-dashboard/stats", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/sector-dashboard/stats",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for non-sector role (SYNDIC)", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/sector-dashboard/stats",
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 when user has no sector membership", async () => {
    const app = await getTestApp();
    const user = await makeUser({ role: "SETOR_MEMBER" as UserRole });
    const res = await authedInject(app, asAuthUser(user), {
      method: "GET",
      url: "/api/sector-dashboard/stats",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when sectorId query is not a member", async () => {
    const app = await getTestApp();
    const { user } = await setupSectorMember();
    const otherSector = await makeSector();
    const res = await authedInject(app, asAuthUser(user), {
      method: "GET",
      url: `/api/sector-dashboard/stats?sectorId=${otherSector.id}`,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns stats for a sector member", async () => {
    const app = await getTestApp();
    const { user, condo, sector } = await setupSectorMember();
    const resident = await makeResident({ condominiumId: condo.id });
    // Open complaint
    await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      sectorId: sector.id,
      status: ComplaintStatus.IN_PROGRESS,
    });
    // Resolved complaint
    await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      sectorId: sector.id,
      status: ComplaintStatus.RESOLVED,
    });

    const res = await authedInject(app, asAuthUser(user), {
      method: "GET",
      url: "/api/sector-dashboard/stats",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("openCount");
    expect(body).toHaveProperty("resolvedLast30Days");
    expect(body).toHaveProperty("slaCompliancePercent");
    expect(body).toHaveProperty("avgResponseTimeHours");
    expect(body.openCount).toBeGreaterThanOrEqual(1);
  });
});
