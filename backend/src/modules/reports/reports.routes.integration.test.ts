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

async function setupSyndicWithCondo() {
  const prisma = getTestPrisma();
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  const condo = await makeCondominium({ primarySyndicId: syndic.id });
  await prisma.userCondominium.create({
    data: { userId: syndic.id, condominiumId: condo.id, role: UserRole.SYNDIC },
  });
  return { syndic, condo };
}

const isoRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400000);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

describe("reports — GET /api/reports/:condominiumId", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/reports/anything?type=complaints&startDate=2024-01-01&endDate=2024-12-31",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for RESIDENT", async () => {
    const app = await getTestApp();
    const condo = await makeCondominium();
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(resident), {
      method: "GET",
      url: `/api/reports/${condo.id}?type=complaints&startDate=2024-01-01&endDate=2024-12-31`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 for syndic without access to this condo", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const otherCondo = await makeCondominium();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${otherCondo.id}?type=complaints&startDate=2024-01-01&endDate=2024-12-31`,
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 when required query params missing", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${condo.id}`,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 on invalid dates", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${condo.id}?type=complaints&startDate=not-a-date&endDate=neither`,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for unknown type", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const { startDate, endDate } = isoRange();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${condo.id}?type=garbage&startDate=${startDate}&endDate=${endDate}`,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns complaints JSON report", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const resident = await makeResident({ condominiumId: condo.id });
    await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
      status: ComplaintStatus.RESOLVED,
    });
    const { startDate, endDate } = isoRange();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${condo.id}?type=complaints&startDate=${startDate}&endDate=${endDate}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe("complaints");
    expect(body.data.summary.total).toBeGreaterThanOrEqual(1);
  });

  it("returns CSV when format=csv", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const resident = await makeResident({ condominiumId: condo.id });
    await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
    });
    const { startDate, endDate } = isoRange();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${condo.id}?type=complaints&format=csv&startDate=${startDate}&endDate=${endDate}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.body).toContain("ID,Categoria,Status");
  });

  it("returns residents JSON report", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    await makeResident({ condominiumId: condo.id, type: "OWNER" });
    const { startDate, endDate } = isoRange();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${condo.id}?type=residents&startDate=${startDate}&endDate=${endDate}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.summary.total).toBeGreaterThanOrEqual(1);
  });

  it("returns messages report (empty ok)", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const { startDate, endDate } = isoRange();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${condo.id}?type=messages&startDate=${startDate}&endDate=${endDate}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.summary.total).toBe(0);
  });

  it("returns satisfaction report (empty ok)", async () => {
    const app = await getTestApp();
    const { syndic, condo } = await setupSyndicWithCondo();
    const { startDate, endDate } = isoRange();
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: `/api/reports/${condo.id}?type=satisfaction&startDate=${startDate}&endDate=${endDate}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.summary.totalResponses).toBe(0);
  });
});
