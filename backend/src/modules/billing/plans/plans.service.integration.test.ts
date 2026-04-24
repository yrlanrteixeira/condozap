import { describe, expect, it } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { getTestPrisma } from "../../../../test/helpers/db";
import { setupIntegrationSuite } from "../../../../test/helpers/build-test-app";
import { makeUser } from "../../../../test/factories";
import * as service from "./plans.service";

setupIntegrationSuite();

const seedPlan = (overrides: Partial<Parameters<typeof getTestPrisma>[0]> = {}) =>
  getTestPrisma().plan.create({
    data: {
      slug: "basic",
      displayName: "Basic",
      minCondominiums: 1,
      maxCondominiums: 5,
      pricePerCondoCents: 4990,
      setupFeeCents: 0,
      sortOrder: 1,
      ...(overrides as Record<string, unknown>),
    },
  });

describe("plans.service", () => {
  describe("listActivePlans / listAllPlans", () => {
    it("listActive returns only isActive=true sorted by sortOrder", async () => {
      const p = getTestPrisma();
      await seedPlan({ slug: "a", sortOrder: 2 });
      await seedPlan({ slug: "b", sortOrder: 1 });
      await seedPlan({ slug: "c", sortOrder: 3, isActive: false });
      const res = await service.listActivePlans(p);
      expect(res.map((r) => r.slug)).toEqual(["b", "a"]);
    });

    it("listAllPlans returns inactive ones too", async () => {
      await seedPlan({ slug: "x", isActive: false });
      const res = await service.listAllPlans(getTestPrisma());
      expect(res.map((r) => r.slug)).toContain("x");
    });
  });

  describe("getPlan", () => {
    it("returns the plan when found", async () => {
      const plan = await seedPlan({ slug: "p" });
      const got = await service.getPlan(getTestPrisma(), plan.id);
      expect(got.id).toBe(plan.id);
    });

    it("throws NotFoundError when missing", async () => {
      await expect(service.getPlan(getTestPrisma(), "nope")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("createPlan", () => {
    it("creates a plan with valid data", async () => {
      const plan = await service.createPlan(getTestPrisma(), {
        slug: "new",
        displayName: "New",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 100,
        setupFeeCents: 0,
        sortOrder: 0,
      });
      expect(plan.slug).toBe("new");
    });

    it("accepts -1 as unlimited maxCondominiums", async () => {
      const plan = await service.createPlan(getTestPrisma(), {
        slug: "unl",
        displayName: "Unlimited",
        minCondominiums: 1,
        maxCondominiums: -1,
        pricePerCondoCents: 100,
        setupFeeCents: 0,
        sortOrder: 0,
      });
      expect(plan.maxCondominiums).toBe(-1);
    });

    it("rejects max < min (other than -1) with BadRequest", async () => {
      await expect(
        service.createPlan(getTestPrisma(), {
          slug: "bad",
          displayName: "Bad",
          minCondominiums: 10,
          maxCondominiums: 5,
          pricePerCondoCents: 100,
          setupFeeCents: 0,
          sortOrder: 0,
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("rejects duplicate slug with Conflict", async () => {
      await seedPlan({ slug: "dup" });
      await expect(
        service.createPlan(getTestPrisma(), {
          slug: "dup",
          displayName: "Dup",
          minCondominiums: 1,
          maxCondominiums: 5,
          pricePerCondoCents: 100,
          setupFeeCents: 0,
          sortOrder: 0,
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe("updatePlan", () => {
    it("updates multiple fields when provided", async () => {
      const plan = await seedPlan({ slug: "u1" });
      const updated = await service.updatePlan(getTestPrisma(), plan.id, {
        displayName: "Updated",
        pricePerCondoCents: 8888,
        setupFeeCents: 10,
        sortOrder: 9,
        isActive: false,
      });
      expect(updated.displayName).toBe("Updated");
      expect(updated.pricePerCondoCents).toBe(8888);
      expect(updated.isActive).toBe(false);
      expect(updated.sortOrder).toBe(9);
      expect(updated.setupFeeCents).toBe(10);
    });

    it("throws NotFound when plan missing", async () => {
      await expect(
        service.updatePlan(getTestPrisma(), "ghost", { displayName: "x" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("validates new min/max range on update", async () => {
      const plan = await seedPlan({ slug: "u2" });
      await expect(
        service.updatePlan(getTestPrisma(), plan.id, {
          minCondominiums: 10,
          maxCondominiums: 5,
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("allows changing slug when no conflict", async () => {
      const plan = await seedPlan({ slug: "renamable" });
      const updated = await service.updatePlan(getTestPrisma(), plan.id, {
        slug: "renamed",
      });
      expect(updated.slug).toBe("renamed");
    });

    it("rejects slug change when it clashes with another plan", async () => {
      const a = await seedPlan({ slug: "a-plan" });
      await seedPlan({ slug: "b-plan" });
      await expect(
        service.updatePlan(getTestPrisma(), a.id, { slug: "b-plan" }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("no-op update when no field is supplied keeps existing data", async () => {
      const plan = await seedPlan({ slug: "noop" });
      const out = await service.updatePlan(getTestPrisma(), plan.id, {});
      expect(out.slug).toBe("noop");
    });

    it("allows changing only minCondominiums while preserving max", async () => {
      const plan = await seedPlan({ slug: "min-only", minCondominiums: 1, maxCondominiums: 5 });
      const out = await service.updatePlan(getTestPrisma(), plan.id, {
        minCondominiums: 2,
      });
      expect(out.minCondominiums).toBe(2);
      expect(out.maxCondominiums).toBe(5);
    });
  });

  describe("deactivatePlan", () => {
    it("flips isActive=false and warns when active subscriptions reference it", async () => {
      const plan = await seedPlan({ slug: "still-used" });
      const syndic = await makeUser({ role: UserRole.SYNDIC });
      await getTestPrisma().subscription.create({
        data: {
          syndicId: syndic.id,
          status: SubscriptionStatus.ACTIVE,
          currentPlanId: plan.id,
        },
      });
      const res = await service.deactivatePlan(getTestPrisma(), plan.id);
      expect(res.plan.isActive).toBe(false);
      expect(res.warning).toContain("1");
    });

    it("emits null warning when no active subs", async () => {
      const plan = await seedPlan({ slug: "unused" });
      const res = await service.deactivatePlan(getTestPrisma(), plan.id);
      expect(res.warning).toBeNull();
      expect(res.plan.isActive).toBe(false);
    });

    it("throws NotFound for missing plan", async () => {
      await expect(service.deactivatePlan(getTestPrisma(), "ghost")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
