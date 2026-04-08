import { PrismaClient, type Plan } from "@prisma/client";
import { noMatchingPlanError } from "./errors";

export interface CycleAmountBreakdown {
  activeCondos: number;
  pricePerCondoCents: number;
  cycleAmountCents: number;
  setupAmountCents: number;
  totalAmountCents: number;
}

export interface ComputeCycleAmountResult extends CycleAmountBreakdown {
  plan: Plan;
}

/**
 * Computes the amount to charge for a subscription cycle based on the
 * current number of condominiums owned by the syndic.
 *
 * The plan is looked up dynamically — there is no "chosen plan" per syndic.
 * The applicable tier is the one whose `[minCondominiums, maxCondominiums]`
 * range contains the active condo count.
 */
export async function computeCycleAmount(
  prisma: PrismaClient,
  syndicId: string,
  isFirstCycle: boolean,
): Promise<ComputeCycleAmountResult> {
  const activeCondos = await prisma.condominium.count({
    where: { primarySyndicId: syndicId },
  });

  // Find the plan tier that covers this count.
  // For the last tier, maxCondominiums = -1 (unlimited).
  const candidates = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const plan = candidates.find((p) => {
    if (p.minCondominiums > activeCondos) return false;
    if (p.maxCondominiums === -1) return true;
    return p.maxCondominiums >= activeCondos;
  });

  if (!plan) {
    throw noMatchingPlanError(activeCondos);
  }

  const cycleAmountCents = activeCondos * plan.pricePerCondoCents;
  const setupAmountCents = isFirstCycle ? plan.setupFeeCents : 0;
  const totalAmountCents = cycleAmountCents + setupAmountCents;

  return {
    plan,
    activeCondos,
    pricePerCondoCents: plan.pricePerCondoCents,
    cycleAmountCents,
    setupAmountCents,
    totalAmountCents,
  };
}
