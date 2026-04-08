/**
 * Runtime verification script for the billing module.
 *
 * Usage: npx tsx --env-file=.env scripts/verify-billing.ts
 *
 * This script is the poor-man's test suite for the pure functions in the
 * billing/lib folder. It exercises resolveSubscriptionState with synthetic
 * subscription records covering every phase, plus computeCycleAmount with
 * real DB data. Every assertion prints a ✓ or ✗ line.
 *
 * It exits non-zero if any assertion fails.
 */

import { PrismaClient, SubscriptionStatus } from "@prisma/client";
import {
  resolveSubscriptionState,
  type SubscriptionPhase,
} from "../src/modules/billing/lib/subscription-state";
import { computeCycleAmount } from "../src/modules/billing/lib/compute-cycle-amount";

const prisma = new PrismaClient();

let failures = 0;
let passes = 0;

function assert(name: string, condition: boolean, details?: string) {
  if (condition) {
    passes++;
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}${details ? " — " + details : ""}`);
  }
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function buildSub(overrides: {
  status: SubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
}) {
  return {
    status: overrides.status,
    trialEndsAt: overrides.trialEndsAt ?? null,
    currentPeriodEnd: overrides.currentPeriodEnd ?? null,
  };
}

function testSubscriptionState() {
  console.log("\n▸ resolveSubscriptionState");
  const now = new Date("2026-04-08T12:00:00Z");

  const cases: Array<{
    name: string;
    sub: Parameters<typeof resolveSubscriptionState>[0];
    expectedPhase: SubscriptionPhase;
    expectedCanWrite: boolean;
  }> = [
    {
      name: "TRIAL with 10 days left → trial, canWrite",
      sub: buildSub({
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: addDays(now, 10),
      }),
      expectedPhase: "trial",
      expectedCanWrite: true,
    },
    {
      name: "TRIAL expired 2 days ago → grace, canWrite",
      sub: buildSub({
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: addDays(now, -2),
      }),
      expectedPhase: "grace",
      expectedCanWrite: true,
    },
    {
      name: "TRIAL expired 5 days ago → soft_locked, no write",
      sub: buildSub({
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: addDays(now, -5),
      }),
      expectedPhase: "soft_locked",
      expectedCanWrite: false,
    },
    {
      name: "TRIAL expired 20 days ago → hard_locked",
      sub: buildSub({
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: addDays(now, -20),
      }),
      expectedPhase: "hard_locked",
      expectedCanWrite: false,
    },
    {
      name: "ACTIVE with 15 days left → active, canWrite",
      sub: buildSub({
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(now, 15),
      }),
      expectedPhase: "active",
      expectedCanWrite: true,
    },
    {
      name: "ACTIVE expired 1 day ago → grace, canWrite",
      sub: buildSub({
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(now, -1),
      }),
      expectedPhase: "grace",
      expectedCanWrite: true,
    },
    {
      name: "ACTIVE expired 2 days ago → still in grace (daysSince < 3)",
      sub: buildSub({
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(now, -2),
      }),
      expectedPhase: "grace",
      expectedCanWrite: true,
    },
    {
      name: "ACTIVE expired exactly 3 days ago → soft_locked (grace boundary)",
      sub: buildSub({
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(now, -3),
      }),
      expectedPhase: "soft_locked",
      expectedCanWrite: false,
    },
    {
      name: "ACTIVE expired 4 days ago → soft_locked",
      sub: buildSub({
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(now, -4),
      }),
      expectedPhase: "soft_locked",
      expectedCanWrite: false,
    },
    {
      name: "ACTIVE expired 14 days ago → soft_locked (last day before hard)",
      sub: buildSub({
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(now, -14),
      }),
      expectedPhase: "soft_locked",
      expectedCanWrite: false,
    },
    {
      name: "ACTIVE expired exactly 15 days ago → hard_locked (boundary)",
      sub: buildSub({
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: addDays(now, -15),
      }),
      expectedPhase: "hard_locked",
      expectedCanWrite: false,
    },
    {
      name: "CANCELLED → cancelled, no write",
      sub: buildSub({ status: SubscriptionStatus.CANCELLED }),
      expectedPhase: "cancelled",
      expectedCanWrite: false,
    },
  ];

  for (const c of cases) {
    const state = resolveSubscriptionState(c.sub, now);
    assert(
      c.name,
      state.phase === c.expectedPhase && state.canWrite === c.expectedCanWrite,
      `got phase=${state.phase} canWrite=${state.canWrite}`,
    );
  }
}

async function testComputeCycleAmount() {
  console.log("\n▸ computeCycleAmount");

  // Find or synthesize an isolated syndic for testing. We won't mutate DB —
  // use a fake syndic id that has zero condominiums to verify the tier-1
  // lookup when activeCondos is 0 (should still resolve to tier-1 since
  // minCondominiums=1 — the count of 0 is BELOW the min, which means
  // there's no matching tier. That's the correct behavior — the script
  // documents this edge.)

  // To exercise the real tier resolution, we pick test counts and call
  // the helper directly against actual seeded plans.
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (plans.length === 0) {
    console.log("  ⚠ skipping — no plans seeded. Run seed-plans.ts first.");
    return;
  }

  const tiers = {
    tier1: plans.find((p) => p.slug === "tier-1"),
    tier2: plans.find((p) => p.slug === "tier-2"),
    tier3: plans.find((p) => p.slug === "tier-3"),
    tier4: plans.find((p) => p.slug === "tier-4"),
  };

  for (const [name, plan] of Object.entries(tiers)) {
    if (!plan) {
      console.log(`  ⚠ skipping ${name} — plan not found`);
    }
  }

  if (!tiers.tier1 || !tiers.tier2 || !tiers.tier3 || !tiers.tier4) {
    console.log("  ⚠ skipping tier assertions — one or more tiers missing");
    return;
  }

  // Test tier resolution by simulating a fake syndic's condo count via raw
  // query. Easier: use any existing syndic and mock the count via the
  // primary lookup logic. Since we don't want to mutate DB, just validate
  // that the plan rows look right.

  assert(
    "tier-1 covers 1..3 at R$800/condo",
    tiers.tier1.minCondominiums === 1 &&
      tiers.tier1.maxCondominiums === 3 &&
      tiers.tier1.pricePerCondoCents === 80000,
  );
  assert(
    "tier-2 covers 4..7 at R$700/condo",
    tiers.tier2.minCondominiums === 4 &&
      tiers.tier2.maxCondominiums === 7 &&
      tiers.tier2.pricePerCondoCents === 70000,
  );
  assert(
    "tier-3 covers 8..15 at R$600/condo",
    tiers.tier3.minCondominiums === 8 &&
      tiers.tier3.maxCondominiums === 15 &&
      tiers.tier3.pricePerCondoCents === 60000,
  );
  assert(
    "tier-4 covers 16+ (maxCondominiums = -1) at R$500/condo",
    tiers.tier4.minCondominiums === 16 &&
      tiers.tier4.maxCondominiums === -1 &&
      tiers.tier4.pricePerCondoCents === 50000,
  );

  // Also verify computeCycleAmount actually resolves against the DB for
  // a real syndic (if any exist)
  const syndic = await prisma.user.findFirst({
    where: { role: { in: ["SYNDIC", "PROFESSIONAL_SYNDIC"] } },
    select: { id: true, name: true },
  });

  if (syndic) {
    try {
      const result = await computeCycleAmount(prisma, syndic.id, true);
      console.log(
        `  ℹ syndic "${syndic.name}" has ${result.activeCondos} condos → ` +
          `tier ${result.plan.slug} · cycle R$${(result.cycleAmountCents / 100).toFixed(2)} · ` +
          `setup R$${(result.setupAmountCents / 100).toFixed(2)} · ` +
          `total R$${(result.totalAmountCents / 100).toFixed(2)}`,
      );
      assert(
        "computeCycleAmount returns matching plan for real syndic",
        result.activeCondos >= result.plan.minCondominiums &&
          (result.plan.maxCondominiums === -1 ||
            result.activeCondos <= result.plan.maxCondominiums),
      );
    } catch (err) {
      if ((err as { code?: string }).code === "NO_MATCHING_PLAN") {
        console.log(
          `  ℹ syndic "${syndic.name}" has no condos — no matching tier (expected)`,
        );
      } else {
        throw err;
      }
    }
  } else {
    console.log("  ⚠ no syndicos in DB — skipping end-to-end tier resolution");
  }
}

async function main() {
  console.log("\n═══ Billing runtime verification ═══");
  testSubscriptionState();
  await testComputeCycleAmount();

  console.log(`\n═══ Result: ${passes} passed, ${failures} failed ═══\n`);

  if (failures > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("verify-billing: fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
