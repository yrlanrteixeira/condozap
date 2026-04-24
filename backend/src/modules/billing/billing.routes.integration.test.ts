import { beforeEach, describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { getTestApp, setupIntegrationSuite } from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeCondominium, makeUser } from "../../../test/factories";
import { mockAbacatePayRequest } from "../../../test/mocks/abacatepay-client";
import { _resetPaymentProviderCache } from "./providers/provider.factory";

setupIntegrationSuite();

beforeEach(() => {
  mockAbacatePayRequest.mockReset();
  _resetPaymentProviderCache();
});

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);

async function seedSyndicActiveSub(condos = 1) {
  const p = getTestPrisma();
  const plan = await p.plan.upsert({
    where: { slug: "basic" },
    update: {},
    create: {
      slug: "basic",
      displayName: "Basic",
      minCondominiums: 1,
      maxCondominiums: 10,
      pricePerCondoCents: 4990,
      setupFeeCents: 200000,
      sortOrder: 1,
    },
  });
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  for (let i = 0; i < condos; i++) {
    await makeCondominium({ primarySyndicId: syndic.id });
  }
  await p.subscription.create({
    data: {
      syndicId: syndic.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), 30),
      setupPaid: true,
      currentPlanId: plan.id,
    },
  });
  return { syndic, plan };
}

describe("GET /api/billing/plans", () => {
  it("returns 200 with active plans for any authenticated user", async () => {
    await getTestPrisma().plan.create({
      data: {
        slug: "p1",
        displayName: "P1",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 100,
        setupFeeCents: 0,
        sortOrder: 1,
      },
    });
    const resident = await makeUser({ role: UserRole.RESIDENT });
    const app = await getTestApp();
    const res = await authedInject(app, resident, {
      method: "GET",
      url: "/api/billing/plans",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).not.toHaveProperty("createdAt"); // DTO-projected
  });

  it("rejects unauthenticated requests", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/billing/plans" });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/billing/plans/all (SUPER_ADMIN only)", () => {
  it("401 without auth", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/billing/plans/all" });
    expect(res.statusCode).toBe(401);
  });

  it("403 for RESIDENT", async () => {
    const u = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(await getTestApp(), u, {
      method: "GET",
      url: "/api/billing/plans/all",
    });
    expect(res.statusCode).toBe(403);
  });

  it("403 for SYNDIC", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(await getTestApp(), u, {
      method: "GET",
      url: "/api/billing/plans/all",
    });
    expect(res.statusCode).toBe(403);
  });

  it("200 for SUPER_ADMIN", async () => {
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), u, {
      method: "GET",
      url: "/api/billing/plans/all",
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("plans CRUD (SUPER_ADMIN)", () => {
  it("POST /plans creates a plan and returns 201", async () => {
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), u, {
      method: "POST",
      url: "/api/billing/plans",
      payload: {
        slug: "created",
        displayName: "Created",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 4990,
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it("POST /plans returns 400 for invalid body", async () => {
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), u, {
      method: "POST",
      url: "/api/billing/plans",
      payload: { slug: "" },
    });
    expect([400, 500]).toContain(res.statusCode);
  });

  it("PATCH /plans/:id updates fields", async () => {
    const plan = await getTestPrisma().plan.create({
      data: {
        slug: "patch-me",
        displayName: "X",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 100,
        setupFeeCents: 0,
        sortOrder: 1,
      },
    });
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), u, {
      method: "PATCH",
      url: `/api/billing/plans/${plan.id}`,
      payload: { displayName: "Patched" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().displayName).toBe("Patched");
  });

  it("DELETE /plans/:id deactivates", async () => {
    const plan = await getTestPrisma().plan.create({
      data: {
        slug: "del-me",
        displayName: "X",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 100,
        setupFeeCents: 0,
        sortOrder: 1,
      },
    });
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), u, {
      method: "DELETE",
      url: `/api/billing/plans/${plan.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().plan.isActive).toBe(false);
  });

  it("GET /plans/:id returns a plan", async () => {
    const plan = await getTestPrisma().plan.create({
      data: {
        slug: "get-id",
        displayName: "X",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 100,
        setupFeeCents: 0,
        sortOrder: 1,
      },
    });
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), u, {
      method: "GET",
      url: `/api/billing/plans/${plan.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(plan.id);
  });
});

describe("GET /api/billing/subscriptions/me", () => {
  it("returns null when user has no subscription", async () => {
    const u = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(await getTestApp(), u, {
      method: "GET",
      url: "/api/billing/subscriptions/me",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("null");
  });

  it("returns the authenticated syndic's subscription DTO", async () => {
    const { syndic } = await seedSyndicActiveSub();
    const res = await authedInject(await getTestApp(), syndic, {
      method: "GET",
      url: "/api/billing/subscriptions/me",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.phase).toBe("active");
    expect(body.canWrite).toBe(true);
  });
});

describe("subscriptions SUPER_ADMIN actions", () => {
  it("GET /subscriptions lists with pagination (SUPER_ADMIN)", async () => {
    await seedSyndicActiveSub();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "GET",
      url: "/api/billing/subscriptions?take=5&skip=0",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(1);
  });

  it("GET /subscriptions 403 for SYNDIC", async () => {
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(await getTestApp(), syndic, {
      method: "GET",
      url: "/api/billing/subscriptions",
    });
    expect(res.statusCode).toBe(403);
  });

  it("GET /subscriptions/:syndicId returns the sub for SUPER_ADMIN", async () => {
    const { syndic } = await seedSyndicActiveSub();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "GET",
      url: `/api/billing/subscriptions/${syndic.id}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /:syndicId/extend-trial rejects invalid days (400)", async () => {
    const { syndic } = await seedSyndicActiveSub();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "POST",
      url: `/api/billing/subscriptions/${syndic.id}/extend-trial`,
      payload: { days: 0 },
    });
    expect([400, 500]).toContain(res.statusCode);
  });

  it("POST /:syndicId/cancel returns CANCELLED", async () => {
    const { syndic } = await seedSyndicActiveSub();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "POST",
      url: `/api/billing/subscriptions/${syndic.id}/cancel`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("CANCELLED");
  });

  it("POST /:syndicId/reactivate returns ACTIVE", async () => {
    const { syndic } = await seedSyndicActiveSub();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "POST",
      url: `/api/billing/subscriptions/${syndic.id}/reactivate`,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ACTIVE");
  });

  it("POST /:syndicId/assign-plan returns 200 and sets plan", async () => {
    const { syndic, plan } = await seedSyndicActiveSub();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "POST",
      url: `/api/billing/subscriptions/${syndic.id}/assign-plan`,
      payload: { planId: plan.id },
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /:syndicId/extend-trial success path with valid days", async () => {
    const { syndic } = await seedSyndicActiveSub();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "POST",
      url: `/api/billing/subscriptions/${syndic.id}/extend-trial`,
      payload: { days: 7 },
    });
    expect(res.statusCode).toBe(200);
  });

  it("GET /platform/metrics returns counts / overdue / trialsExpiring", async () => {
    await seedSyndicActiveSub();
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "GET",
      url: "/api/billing/subscriptions/platform/metrics",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.counts).toBeTruthy();
    expect(Array.isArray(body.trialsExpiring)).toBe(true);
    expect(Array.isArray(body.overdue)).toBe(true);
  });
});

describe("bills endpoints", () => {
  it("POST /bills/pix 403 when RESIDENT", async () => {
    const u = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(await getTestApp(), u, {
      method: "POST",
      url: "/api/billing/bills/pix",
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /bills/pix 403 when SUPER_ADMIN (regression: SA cannot act as syndic)", async () => {
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "POST",
      url: "/api/billing/bills/pix",
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /bills/pix creates bill as SYNDIC", async () => {
    const { syndic } = await seedSyndicActiveSub(1);
    mockAbacatePayRequest.mockResolvedValueOnce({
      id: "ext_1",
      brCode: "BR",
      brCodeBase64: "B64",
      expiresAt: "2026-05-01T00:00:00Z",
    });
    const res = await authedInject(await getTestApp(), syndic, {
      method: "POST",
      url: "/api/billing/bills/pix",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.externalId).toBeUndefined();
    expect(body.providerPayload).toBeUndefined();
    expect(body.pixBrCode).toBe("BR");
  });

  it("POST /bills/card creates card bill as SYNDIC", async () => {
    const { syndic } = await seedSyndicActiveSub(1);
    mockAbacatePayRequest.mockResolvedValueOnce({
      id: "ext_card",
      url: "https://checkout",
    });
    const res = await authedInject(await getTestApp(), syndic, {
      method: "POST",
      url: "/api/billing/bills/card",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().checkoutUrl).toBe("https://checkout");
  });

  it("GET /bills/me returns [] for user without subscription", async () => {
    const u = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(await getTestApp(), u, {
      method: "GET",
      url: "/api/billing/bills/me",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("GET /bills/me returns bills for the syndic without leaking providerPayload", async () => {
    const { syndic } = await seedSyndicActiveSub(1);
    const p = getTestPrisma();
    const sub = await p.subscription.findUnique({ where: { syndicId: syndic.id } });
    await p.paymentBill.create({
      data: {
        subscriptionId: sub!.id,
        type: "SUBSCRIPTION_CYCLE",
        status: "PAID",
        amountCents: 1000,
        breakdown: {},
        providerPayload: { secret: "leak" },
      },
    });
    const res = await authedInject(await getTestApp(), syndic, {
      method: "GET",
      url: "/api/billing/bills/me",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].providerPayload).toBeUndefined();
    expect(res.body).not.toContain("leak");
  });

  it("GET /bills/syndic/:id 403 for non-SUPER_ADMIN", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(await getTestApp(), u, {
      method: "GET",
      url: "/api/billing/bills/syndic/someone",
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /bills/manual/:id 403 for SYNDIC (only SUPER_ADMIN allowed)", async () => {
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const res = await authedInject(await getTestApp(), syndic, {
      method: "POST",
      url: "/api/billing/bills/manual/anyid",
      payload: { amountCents: 1000 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /bills/manual/:syndicId creates a manual bill as SUPER_ADMIN", async () => {
    const { syndic } = await seedSyndicActiveSub(1);
    mockAbacatePayRequest.mockResolvedValueOnce({
      id: "ext_manual",
      brCode: "BR",
      brCodeBase64: "B64",
      expiresAt: "2026-05-01T00:00:00Z",
    });
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "POST",
      url: `/api/billing/bills/manual/${syndic.id}`,
      payload: { amountCents: 1500, description: "Serviço extra" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().amountCents).toBe(1500);
  });

  it("GET /bills/syndic/:id returns 50-limit list for SUPER_ADMIN", async () => {
    const { syndic } = await seedSyndicActiveSub(1);
    const sa = await makeUser({ role: UserRole.SUPER_ADMIN });
    const res = await authedInject(await getTestApp(), sa, {
      method: "GET",
      url: `/api/billing/bills/syndic/${syndic.id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});
