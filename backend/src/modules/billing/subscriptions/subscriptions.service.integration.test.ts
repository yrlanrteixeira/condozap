import { describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { getTestPrisma } from "../../../../test/helpers/db";
import { setupIntegrationSuite } from "../../../../test/helpers/build-test-app";
import { makeCondominium, makeUser } from "../../../../test/factories";
import * as service from "./subscriptions.service";

setupIntegrationSuite();

const addDays = (d: Date, days: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

async function seedSyndicWithSub(opts: {
  status?: SubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  currentPlanId?: string | null;
  setupPaid?: boolean;
} = {}) {
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  const sub = await getTestPrisma().subscription.create({
    data: {
      syndicId: syndic.id,
      status: opts.status ?? SubscriptionStatus.TRIAL,
      trialEndsAt: opts.trialEndsAt ?? addDays(new Date(), 5),
      currentPeriodEnd: opts.currentPeriodEnd ?? null,
      currentPlanId: opts.currentPlanId ?? null,
      setupPaid: opts.setupPaid ?? false,
    },
  });
  return { syndic, sub };
}

describe("subscriptions.service", () => {
  describe("getMySubscription", () => {
    it("returns null when no subscription exists", async () => {
      const user = await makeUser({ role: UserRole.SYNDIC });
      const res = await service.getMySubscription(getTestPrisma(), user.id);
      expect(res).toBeNull();
    });
    it("returns sub + derived state", async () => {
      const { syndic } = await seedSyndicWithSub();
      const res = await service.getMySubscription(getTestPrisma(), syndic.id);
      expect(res?.state.phase).toBe("trial");
    });
  });

  describe("getSubscriptionBySyndicId", () => {
    it("throws NotFound when missing", async () => {
      await expect(
        service.getSubscriptionBySyndicId(getTestPrisma(), "ghost"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
    it("returns sub+state when present", async () => {
      const { syndic } = await seedSyndicWithSub({ status: SubscriptionStatus.ACTIVE, currentPeriodEnd: addDays(new Date(), 10), trialEndsAt: null });
      const res = await service.getSubscriptionBySyndicId(getTestPrisma(), syndic.id);
      expect(res.state.phase).toBe("active");
    });
  });

  describe("listAllSubscriptions", () => {
    it("paginates results and exposes total count", async () => {
      await seedSyndicWithSub();
      await seedSyndicWithSub();
      await seedSyndicWithSub();
      const { items, total } = await service.listAllSubscriptions(getTestPrisma(), 2, 0);
      expect(total).toBe(3);
      expect(items).toHaveLength(2);
    });
  });

  describe("extendTrial", () => {
    it("extends from current trialEndsAt when still in the future", async () => {
      const future = addDays(new Date(), 5);
      const { syndic, sub } = await seedSyndicWithSub({ trialEndsAt: future });
      const updated = await service.extendTrial(getTestPrisma(), syndic.id, 10);
      const expected = addDays(future, 10);
      expect(updated.trialEndsAt!.toDateString()).toBe(expected.toDateString());
      expect(updated.id).toBe(sub.id);
      expect(updated.status).toBe(SubscriptionStatus.TRIAL);
    });

    it("extends from NOW when trial is already past", async () => {
      const past = addDays(new Date(), -2);
      const { syndic } = await seedSyndicWithSub({ trialEndsAt: past });
      const updated = await service.extendTrial(getTestPrisma(), syndic.id, 7);
      const now = new Date();
      const expected = addDays(now, 7);
      expect(updated.trialEndsAt!.getTime()).toBeGreaterThan(now.getTime());
      expect(
        Math.abs(updated.trialEndsAt!.getTime() - expected.getTime()),
      ).toBeLessThan(60_000);
    });

    it("throws NotFound for missing subscription", async () => {
      await expect(
        service.extendTrial(getTestPrisma(), "none", 5),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("cancelSubscription", () => {
    it("sets status=CANCELLED and cancelledAt", async () => {
      const { syndic } = await seedSyndicWithSub();
      const res = await service.cancelSubscription(getTestPrisma(), syndic.id);
      expect(res.status).toBe(SubscriptionStatus.CANCELLED);
      expect(res.cancelledAt).toBeInstanceOf(Date);
    });

    it("throws NotFound when subscription absent", async () => {
      await expect(
        service.cancelSubscription(getTestPrisma(), "ghost"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("reactivateSubscription", () => {
    it("moves to ACTIVE with a fresh period window", async () => {
      const { syndic } = await seedSyndicWithSub({ status: SubscriptionStatus.CANCELLED });
      const res = await service.reactivateSubscription(getTestPrisma(), syndic.id, 45);
      expect(res.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.currentPeriodEnd).toBeInstanceOf(Date);
      expect(res.cancelledAt).toBeNull();
    });

    it("throws NotFound when subscription absent", async () => {
      await expect(
        service.reactivateSubscription(getTestPrisma(), "ghost", 30),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("assignPlanManually", () => {
    it("connects the plan, sets setupPaid=true and ACTIVE", async () => {
      const p = getTestPrisma();
      const plan = await p.plan.create({
        data: {
          slug: "assigned",
          displayName: "Assigned",
          minCondominiums: 1,
          maxCondominiums: 5,
          pricePerCondoCents: 100,
          setupFeeCents: 0,
          sortOrder: 1,
        },
      });
      const { syndic } = await seedSyndicWithSub();
      const res = await service.assignPlanManually(p, syndic.id, plan.id, 60);
      expect(res.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.setupPaid).toBe(true);
      expect(res.currentPlanId).toBe(plan.id);
    });

    it("throws NotFound when plan is missing", async () => {
      const { syndic } = await seedSyndicWithSub();
      await expect(
        service.assignPlanManually(getTestPrisma(), syndic.id, "ghost_plan", 30),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws NotFound when subscription is missing", async () => {
      const p = getTestPrisma();
      const plan = await p.plan.create({
        data: {
          slug: "orphan",
          displayName: "Orphan",
          minCondominiums: 1,
          maxCondominiums: 5,
          pricePerCondoCents: 1,
          setupFeeCents: 0,
          sortOrder: 1,
        },
      });
      await expect(
        service.assignPlanManually(p, "ghost_sub", plan.id, 30),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("getPlatformMetrics", () => {
    it("returns counts, MRR (0 when no active) and overdue lists", async () => {
      // Setup: 1 TRIAL expiring soon, 1 ACTIVE (future), 1 ACTIVE (past = overdue), 1 CANCELLED
      const plan = await getTestPrisma().plan.create({
        data: {
          slug: "metrics",
          displayName: "Metrics",
          minCondominiums: 1,
          maxCondominiums: 5,
          pricePerCondoCents: 1000,
          setupFeeCents: 0,
          sortOrder: 1,
        },
      });

      const s1 = await makeUser({ role: UserRole.SYNDIC });
      await makeCondominium({ primarySyndicId: s1.id });
      await getTestPrisma().subscription.create({
        data: {
          syndicId: s1.id,
          status: SubscriptionStatus.ACTIVE,
          currentPlanId: plan.id,
          currentPeriodEnd: addDays(new Date(), 10),
        },
      });

      const s2 = await makeUser({ role: UserRole.SYNDIC });
      await getTestPrisma().subscription.create({
        data: {
          syndicId: s2.id,
          status: SubscriptionStatus.TRIAL,
          trialEndsAt: addDays(new Date(), 3),
        },
      });

      const s3 = await makeUser({ role: UserRole.SYNDIC });
      await getTestPrisma().subscription.create({
        data: {
          syndicId: s3.id,
          status: SubscriptionStatus.ACTIVE,
          currentPlanId: plan.id,
          currentPeriodEnd: addDays(new Date(), -5),
        },
      });

      const metrics = await service.getPlatformMetrics(getTestPrisma());
      expect(metrics.counts.active).toBe(2);
      expect(metrics.counts.trial).toBe(1);
      expect(metrics.mrrCents).toBe(1000); // s1 has 1 condo × 1000 ; s3 has 0
      expect(metrics.trialsExpiring.length).toBe(1);
      expect(metrics.overdue.length).toBeGreaterThan(0);
    });

    it("returns zeros when DB is empty", async () => {
      const m = await service.getPlatformMetrics(getTestPrisma());
      expect(m.mrrCents).toBe(0);
      expect(m.counts.active).toBe(0);
      expect(m.counts.trial).toBe(0);
      expect(m.counts.cancelled).toBe(0);
      expect(m.counts.expired).toBe(0);
      expect(m.trialsExpiring).toEqual([]);
      expect(m.overdue).toEqual([]);
    });
  });
});
