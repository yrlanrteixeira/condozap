import { describe, expect, it } from "vitest";
import { CondominiumStatus, UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { makeCondominium, makeUser } from "../../../test/factories";

setupIntegrationSuite();

const asAuthUser = (u: Awaited<ReturnType<typeof makeUser>>) => ({
  id: u.id,
  email: u.email,
  role: u.role as string,
  name: u.name,
  status: u.status,
  permissionScope: u.permissionScope,
});

describe("platform — GET /api/platform/stats", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/platform/stats" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for non SUPER_ADMIN", async () => {
    const app = await getTestApp();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(app, asAuthUser(syndic), {
      method: "GET",
      url: "/api/platform/stats",
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns aggregate stats for SUPER_ADMIN", async () => {
    const app = await getTestApp();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    await makeCondominium({ status: CondominiumStatus.ACTIVE });
    await makeCondominium({ status: CondominiumStatus.TRIAL });
    await makeUser({ role: UserRole.SYNDIC });

    const res = await authedInject(app, asAuthUser(sa), {
      method: "GET",
      url: "/api/platform/stats",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.condominiums.total).toBeGreaterThanOrEqual(2);
    expect(body.condominiums.active).toBeGreaterThanOrEqual(1);
    expect(body.condominiums.trial).toBeGreaterThanOrEqual(1);
    expect(body.syndics.total).toBeGreaterThanOrEqual(1);
    expect(typeof body.newThisMonth).toBe("number");
    expect(typeof body.trialsExpiringSoon).toBe("number");
  });
});
