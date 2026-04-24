import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { getTestApp, setupIntegrationSuite } from "../../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../../test/helpers/db";
import { makeUser } from "../../../../test/factories";
import fixture from "../../../../test/fixtures/abacatepay-webhook.json";

const WEBHOOK_SECRET = "test-webhook-secret";

setupIntegrationSuite();

beforeAll(() => {
  process.env.BILLING_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

async function seedPendingBill(opts: {
  externalId?: string;
  status?: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
} = {}) {
  const p = getTestPrisma();
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  const sub = await p.subscription.create({
    data: {
      syndicId: syndic.id,
      status: SubscriptionStatus.TRIAL,
    },
  });
  const bill = await p.paymentBill.create({
    data: {
      subscriptionId: sub.id,
      type: "SUBSCRIPTION_CYCLE",
      method: "PIX",
      status: opts.status ?? "PENDING",
      amountCents: 4990,
      breakdown: {},
      providerId: "abacatepay",
      externalId: opts.externalId ?? "bill_mock_123",
    },
  });
  return { bill, sub, syndic };
}

const post = async (secret: string, body: unknown) =>
  (await getTestApp()).inject({
    method: "POST",
    url: `/api/billing/webhooks/abacatepay/${secret}`,
    payload: body as Record<string, unknown>,
  });

describe("AbacatePay webhook", () => {
  beforeEach(() => {
    process.env.BILLING_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  it("returns 200 (no info leak) when the path secret is wrong", async () => {
    const res = await post("wrong-secret", fixture);
    expect(res.statusCode).toBe(200);
    const events = await getTestPrisma().webhookEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0].error).toBe("invalid_secret");
  });

  it("returns 200 when BILLING_WEBHOOK_SECRET is unset (treated as invalid)", async () => {
    delete process.env.BILLING_WEBHOOK_SECRET;
    const res = await post(WEBHOOK_SECRET, fixture);
    expect(res.statusCode).toBe(200);
    const events = await getTestPrisma().webhookEvent.findMany();
    expect(events[0].error).toBe("invalid_secret");
  });

  it("returns 200 + logs unknown_event_type for an event we don't handle", async () => {
    const res = await post(WEBHOOK_SECRET, {
      event: "something.weird",
      data: { id: "b1" },
    });
    expect(res.statusCode).toBe(200);
    const events = await getTestPrisma().webhookEvent.findMany();
    expect(events[0].error).toBe("unknown_event_type");
  });

  it("returns 200 + logs bill_not_found when externalId doesn't match any bill", async () => {
    const res = await post(WEBHOOK_SECRET, {
      event: "billing.paid",
      data: { id: "ghost_bill" },
    });
    expect(res.statusCode).toBe(200);
    const events = await getTestPrisma().webhookEvent.findMany();
    expect(events[0].error).toBe("bill_not_found");
    expect(events[0].externalId).toBe("ghost_bill");
  });

  it("marks bill PAID and activates subscription on billing.paid", async () => {
    const { bill, sub } = await seedPendingBill();
    const res = await post(WEBHOOK_SECRET, fixture);
    expect(res.statusCode).toBe(200);

    const updatedBill = await getTestPrisma().paymentBill.findUnique({ where: { id: bill.id } });
    expect(updatedBill?.status).toBe("PAID");
    expect(updatedBill?.paidAt).toBeInstanceOf(Date);

    const updatedSub = await getTestPrisma().subscription.findUnique({ where: { id: sub.id } });
    expect(updatedSub?.status).toBe("ACTIVE");
    expect(updatedSub?.setupPaid).toBe(true);
    expect(updatedSub?.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it("is idempotent: replaying the same billing.paid creates no duplicate PaymentBill and extends once", async () => {
    const { bill, sub } = await seedPendingBill();
    await post(WEBHOOK_SECRET, fixture);
    const firstEnd = (
      await getTestPrisma().subscription.findUnique({ where: { id: sub.id } })
    )?.currentPeriodEnd;

    await post(WEBHOOK_SECRET, fixture);

    const bills = await getTestPrisma().paymentBill.findMany({ where: { id: bill.id } });
    expect(bills).toHaveLength(1);
    expect(bills[0].status).toBe("PAID");

    const secondEnd = (
      await getTestPrisma().subscription.findUnique({ where: { id: sub.id } })
    )?.currentPeriodEnd;
    expect(secondEnd?.toISOString()).toBe(firstEnd?.toISOString());
  });

  it("updates bill status to FAILED on billing.failed and does NOT duplicate the row", async () => {
    const { bill } = await seedPendingBill({ externalId: "failed_bill_1" });
    const res = await post(WEBHOOK_SECRET, {
      event: "billing.failed",
      data: { id: "failed_bill_1" },
    });
    expect(res.statusCode).toBe(200);
    const updated = await getTestPrisma().paymentBill.findUnique({ where: { id: bill.id } });
    expect(updated?.status).toBe("FAILED");
    const count = await getTestPrisma().paymentBill.count();
    expect(count).toBe(1);
  });

  it("updates bill status to EXPIRED on billing.expired", async () => {
    const { bill } = await seedPendingBill({ externalId: "exp_bill_1" });
    const res = await post(WEBHOOK_SECRET, {
      event: "billing.expired",
      data: { id: "exp_bill_1" },
    });
    expect(res.statusCode).toBe(200);
    const updated = await getTestPrisma().paymentBill.findUnique({ where: { id: bill.id } });
    expect(updated?.status).toBe("EXPIRED");
  });

  it("short-circuits fast-path idempotency when bill is already PAID", async () => {
    const { bill } = await seedPendingBill({ status: "PAID" });
    const res = await post(WEBHOOK_SECRET, fixture);
    expect(res.statusCode).toBe(200);
    // Should still just be the one row, still PAID.
    const after = await getTestPrisma().paymentBill.findUnique({ where: { id: bill.id } });
    expect(after?.status).toBe("PAID");
  });

  it("connects the paid bill's plan onto the subscription when planId is set", async () => {
    const p = getTestPrisma();
    const plan = await p.plan.create({
      data: {
        slug: "webhook-plan",
        displayName: "Webhook Plan",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 4990,
        setupFeeCents: 0,
        sortOrder: 1,
      },
    });
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const sub = await p.subscription.create({
      data: { syndicId: syndic.id, status: SubscriptionStatus.TRIAL },
    });
    const bill = await p.paymentBill.create({
      data: {
        subscriptionId: sub.id,
        planId: plan.id,
        type: "FIRST_CYCLE",
        status: "PENDING",
        amountCents: 4990,
        breakdown: {},
        providerId: "abacatepay",
        externalId: "bill_with_plan",
      },
    });

    await post(WEBHOOK_SECRET, {
      event: "billing.paid",
      data: { id: "bill_with_plan" },
    });

    const updatedSub = await p.subscription.findUnique({ where: { id: sub.id } });
    expect(updatedSub?.currentPlanId).toBe(plan.id);
    expect(updatedSub?.status).toBe("ACTIVE");

    const updatedBill = await p.paymentBill.findUnique({ where: { id: bill.id } });
    expect(updatedBill?.status).toBe("PAID");
  });

  it("preserves prepaid days: extends from existing currentPeriodEnd when still in the future", async () => {
    const p = getTestPrisma();
    const future = new Date(Date.now() + 5 * 86400_000);
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    const sub = await p.subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: future,
      },
    });
    await p.paymentBill.create({
      data: {
        subscriptionId: sub.id,
        type: "SUBSCRIPTION_CYCLE",
        status: "PENDING",
        amountCents: 100,
        breakdown: {},
        providerId: "abacatepay",
        externalId: "extend_from_future",
      },
    });

    await post(WEBHOOK_SECRET, {
      event: "billing.paid",
      data: { id: "extend_from_future" },
    });

    const after = await p.subscription.findUnique({ where: { id: sub.id } });
    const expected = new Date(future.getTime() + 30 * 86400_000);
    expect(after?.currentPeriodEnd?.toISOString()).toBe(expected.toISOString());
  });
});
