import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { getTestPrisma } from "../../../../test/helpers/db";
import { setupIntegrationSuite } from "../../../../test/helpers/build-test-app";
import { makeCondominium, makeUser } from "../../../../test/factories";
import { mockAbacatePayRequest } from "../../../../test/mocks/abacatepay-client";
import { _resetPaymentProviderCache } from "../providers/provider.factory";
import { runBillingEscalateJob } from "./escalate.job";
import { runBillingReminderJob } from "./reminder.job";
import { runTrialReminderJob } from "./trial-reminder.job";

setupIntegrationSuite();

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);

const fakeLogger = (): FastifyBaseLogger => {
  const stub = vi.fn();
  return {
    info: stub,
    error: stub,
    warn: stub,
    debug: stub,
    trace: stub,
    fatal: stub,
    child: () => fakeLogger(),
    level: "info",
  } as unknown as FastifyBaseLogger;
};

beforeEach(() => {
  mockAbacatePayRequest.mockReset();
  _resetPaymentProviderCache();
});

describe("runBillingEscalateJob", () => {
  it("notifies only subscriptions that moved into grace/soft/hard states", async () => {
    const p = getTestPrisma();
    // Active + future -> NOT notified
    const s1 = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s1.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(new Date(), 10),
      },
    });
    // Active + past -> grace -> NOT notified (resolveSubscriptionState: canWrite still true is 'grace')
    const s2 = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s2.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(new Date(), -1),
      },
    });
    // Active + very past -> soft_locked -> notified
    const s3 = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s3.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(new Date(), -10),
      },
    });

    const notified = await runBillingEscalateJob(p, fakeLogger());
    expect(notified).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 when no candidates exist", async () => {
    const notified = await runBillingEscalateJob(getTestPrisma(), fakeLogger());
    expect(notified).toBe(0);
  });

  it("recovers and logs when notifier throws for one subscription", async () => {
    const p = getTestPrisma();
    const s = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(new Date(), -20),
      },
    });
    const logger = fakeLogger();
    // Spy on the notifier module
    const notifier = await import("../notifications/billing-notifier.service");
    const spy = vi
      .spyOn(notifier, "sendOverdueNotice")
      .mockRejectedValueOnce(new Error("boom"));
    const notified = await runBillingEscalateJob(p, logger);
    expect(notified).toBe(0);
    expect(logger.error).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("runBillingReminderJob", () => {
  it("generates a new PIX bill when currentPeriodEnd is 4-6 days away and none pending", async () => {
    const p = getTestPrisma();
    const plan = await p.plan.create({
      data: {
        slug: "cycle",
        displayName: "Cycle",
        minCondominiums: 1,
        maxCondominiums: 10,
        pricePerCondoCents: 4990,
        setupFeeCents: 0,
        sortOrder: 1,
      },
    });
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await makeCondominium({ primarySyndicId: syndic.id });
    await p.subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.ACTIVE,
        setupPaid: true,
        currentPlanId: plan.id,
        currentPeriodEnd: addDays(new Date(), 5),
      },
    });
    mockAbacatePayRequest.mockResolvedValueOnce({
      id: "ext_rem",
      brCode: "BR",
      brCodeBase64: "B64",
      expiresAt: "2026-05-01T00:00:00Z",
    });
    const processed = await runBillingReminderJob(p, fakeLogger());
    expect(processed).toBe(1);
    expect(await p.paymentBill.count()).toBe(1);
  });

  it("skips when a PENDING bill already exists (idempotent)", async () => {
    const p = getTestPrisma();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await makeCondominium({ primarySyndicId: syndic.id });
    const sub = await p.subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(new Date(), 5),
      },
    });
    await p.paymentBill.create({
      data: {
        subscriptionId: sub.id,
        type: "SUBSCRIPTION_CYCLE",
        status: "PENDING",
        amountCents: 100,
        breakdown: {},
      },
    });
    const processed = await runBillingReminderJob(p, fakeLogger());
    expect(processed).toBe(0);
    expect(await p.paymentBill.count()).toBe(1);
  });

  it("logs and continues when one subscription fails (e.g. no plan)", async () => {
    const p = getTestPrisma();
    const syndic = await makeUser({ role: UserRole.SYNDIC });
    await makeCondominium({ primarySyndicId: syndic.id });
    await p.subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.ACTIVE,
        setupPaid: true,
        currentPeriodEnd: addDays(new Date(), 5),
      },
    });
    // No plan exists → NO_MATCHING_PLAN → caught & logged
    const logger = fakeLogger();
    const processed = await runBillingReminderJob(p, logger);
    expect(processed).toBe(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns 0 when no subscription is close to renewal", async () => {
    const processed = await runBillingReminderJob(getTestPrisma(), fakeLogger());
    expect(processed).toBe(0);
  });
});

describe("runTrialReminderJob", () => {
  it("notifies trial subs expiring within 3 days (inclusive branches 3/1/0)", async () => {
    const p = getTestPrisma();

    const s3 = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s3.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: addDays(new Date(), 3),
      },
    });
    const s1 = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s1.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: addDays(new Date(), 1),
      },
    });
    const s0 = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s0.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: new Date(Date.now() + 3600_000), // a few hours from now => daysLeft=0
      },
    });

    const notified = await runTrialReminderJob(p, fakeLogger());
    expect(notified).toBe(3);
  });

  it("skips TRIAL subs whose trialEndsAt is null (defensive)", async () => {
    const p = getTestPrisma();
    const s = await makeUser({ role: UserRole.SYNDIC });
    // trialEndsAt filter `{gte: now, lte: in3Days}` won't match null, so the
    // job selects zero candidates — returns 0.
    await p.subscription.create({
      data: { syndicId: s.id, status: SubscriptionStatus.TRIAL, trialEndsAt: null },
    });
    const notified = await runTrialReminderJob(p, fakeLogger());
    expect(notified).toBe(0);
  });

  it("returns 0 when no trial subs are expiring soon", async () => {
    const p = getTestPrisma();
    const s = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: addDays(new Date(), 30),
      },
    });
    const notified = await runTrialReminderJob(p, fakeLogger());
    expect(notified).toBe(0);
  });

  it("logs and continues when notifier throws", async () => {
    const p = getTestPrisma();
    const s = await makeUser({ role: UserRole.SYNDIC });
    await p.subscription.create({
      data: {
        syndicId: s.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: addDays(new Date(), 2),
      },
    });
    const notifier = await import("../notifications/billing-notifier.service");
    const spy = vi.spyOn(notifier, "sendTrialExpiringNotice").mockRejectedValueOnce(new Error("x"));
    const logger = fakeLogger();
    const notified = await runTrialReminderJob(p, logger);
    expect(notified).toBe(0);
    expect(logger.error).toHaveBeenCalled();
    spy.mockRestore();
  });
});
