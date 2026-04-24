import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { getTestPrisma } from "../../../../test/helpers/db";
import { setupIntegrationSuite } from "../../../../test/helpers/build-test-app";
import { makeCondominium, makeUser } from "../../../../test/factories";
import { computeCycleAmount } from "./compute-cycle-amount";

setupIntegrationSuite();

async function makeSyndicWithCondos(count: number) {
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  for (let i = 0; i < count; i++) {
    await makeCondominium({ primarySyndicId: syndic.id });
  }
  return syndic;
}

async function seedPlans() {
  const p = getTestPrisma();
  return p.plan.createManyAndReturn({
    data: [
      {
        slug: "tier1",
        displayName: "Tier 1 (1-5)",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 4990,
        setupFeeCents: 200000,
        sortOrder: 1,
      },
      {
        slug: "tier2",
        displayName: "Tier 2 (6-20)",
        minCondominiums: 6,
        maxCondominiums: 20,
        pricePerCondoCents: 3990,
        setupFeeCents: 200000,
        sortOrder: 2,
      },
      {
        slug: "tier3",
        displayName: "Tier 3 (21+)",
        minCondominiums: 21,
        maxCondominiums: -1, // unlimited
        pricePerCondoCents: 2990,
        setupFeeCents: 200000,
        sortOrder: 3,
      },
    ],
  });
}

describe("computeCycleAmount", () => {
  it("throws NO_CONDOMINIUMS_TO_BILL when syndic has zero condos", async () => {
    const syndic = await makeSyndicWithCondos(0);
    await seedPlans();
    await expect(computeCycleAmount(getTestPrisma(), syndic.id, false)).rejects.toMatchObject({
      code: "NO_CONDOMINIUMS_TO_BILL",
    });
  });

  it("throws NO_MATCHING_PLAN when no plan covers the current condo count", async () => {
    const syndic = await makeSyndicWithCondos(2);
    const p = getTestPrisma();
    await p.plan.create({
      data: {
        slug: "only-big",
        displayName: "Only Big",
        minCondominiums: 10,
        maxCondominiums: 20,
        pricePerCondoCents: 1000,
        setupFeeCents: 0,
        sortOrder: 1,
      },
    });
    await expect(computeCycleAmount(p, syndic.id, false)).rejects.toMatchObject({
      code: "NO_MATCHING_PLAN",
    });
  });

  it("selects the first-tier plan and returns correct breakdown WITHOUT setup when not first cycle", async () => {
    const syndic = await makeSyndicWithCondos(3);
    await seedPlans();
    const res = await computeCycleAmount(getTestPrisma(), syndic.id, false);
    expect(res.plan.slug).toBe("tier1");
    expect(res.activeCondos).toBe(3);
    expect(res.pricePerCondoCents).toBe(4990);
    expect(res.cycleAmountCents).toBe(3 * 4990);
    expect(res.setupAmountCents).toBe(0);
    expect(res.totalAmountCents).toBe(3 * 4990);
  });

  it("includes setup fee when isFirstCycle=true", async () => {
    const syndic = await makeSyndicWithCondos(2);
    await seedPlans();
    const res = await computeCycleAmount(getTestPrisma(), syndic.id, true);
    expect(res.setupAmountCents).toBe(200000);
    expect(res.totalAmountCents).toBe(2 * 4990 + 200000);
  });

  it("selects middle tier for boundary counts (6 and 20)", async () => {
    await seedPlans();
    const syndic6 = await makeSyndicWithCondos(6);
    const syndic20 = await makeSyndicWithCondos(20);
    const r6 = await computeCycleAmount(getTestPrisma(), syndic6.id, false);
    const r20 = await computeCycleAmount(getTestPrisma(), syndic20.id, false);
    expect(r6.plan.slug).toBe("tier2");
    expect(r20.plan.slug).toBe("tier2");
  });

  it("selects the unlimited tier when maxCondominiums = -1", async () => {
    const syndic = await makeSyndicWithCondos(25);
    await seedPlans();
    const res = await computeCycleAmount(getTestPrisma(), syndic.id, false);
    expect(res.plan.slug).toBe("tier3");
    expect(res.cycleAmountCents).toBe(25 * 2990);
  });

  it("ignores inactive plans when picking the tier", async () => {
    const syndic = await makeSyndicWithCondos(2);
    const p = getTestPrisma();
    await p.plan.create({
      data: {
        slug: "inactive",
        displayName: "Inactive",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 10,
        setupFeeCents: 0,
        sortOrder: 0,
        isActive: false,
      },
    });
    await p.plan.create({
      data: {
        slug: "active",
        displayName: "Active",
        minCondominiums: 1,
        maxCondominiums: 5,
        pricePerCondoCents: 4990,
        setupFeeCents: 0,
        sortOrder: 1,
      },
    });
    const res = await computeCycleAmount(p, syndic.id, false);
    expect(res.plan.slug).toBe("active");
  });
});
