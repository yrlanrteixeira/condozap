import type { PrismaClient } from "@prisma/client";
import { SubscriptionStatus } from "@prisma/client";
import { NotFoundError } from "../../../shared/errors";
import { resolveSubscriptionState } from "../lib/subscription-state";
import * as planRepo from "../plans/plans.repository";
import * as repo from "./subscriptions.repository";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function getMySubscription(
  prisma: PrismaClient,
  syndicId: string,
) {
  const sub = await repo.findBySyndicId(prisma, syndicId);
  if (!sub) return null;
  const state = resolveSubscriptionState(sub);
  return { sub, state };
}

export async function getSubscriptionBySyndicId(
  prisma: PrismaClient,
  syndicId: string,
) {
  const sub = await repo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");
  const state = resolveSubscriptionState(sub);
  return { sub, state };
}

export const listAllSubscriptions = (
  prisma: PrismaClient,
  take?: number,
  skip?: number,
) => repo.listAll(prisma, take, skip);

export async function extendTrial(
  prisma: PrismaClient,
  syndicId: string,
  days: number,
) {
  const sub = await repo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");

  const base = sub.trialEndsAt && sub.trialEndsAt > new Date()
    ? sub.trialEndsAt
    : new Date();
  const newEnd = addDays(base, days);

  return repo.update(prisma, sub.id, {
    status: SubscriptionStatus.TRIAL,
    trialEndsAt: newEnd,
    cancelledAt: null,
  });
}

export async function cancelSubscription(
  prisma: PrismaClient,
  syndicId: string,
) {
  const sub = await repo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");
  return repo.update(prisma, sub.id, {
    status: SubscriptionStatus.CANCELLED,
    cancelledAt: new Date(),
  });
}

export async function reactivateSubscription(
  prisma: PrismaClient,
  syndicId: string,
  periodEndDays: number,
) {
  const sub = await repo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");
  const now = new Date();
  return repo.update(prisma, sub.id, {
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: now,
    currentPeriodEnd: addDays(now, periodEndDays),
    cancelledAt: null,
  });
}

export async function assignPlanManually(
  prisma: PrismaClient,
  syndicId: string,
  planId: string,
  periodEndDays: number,
) {
  const sub = await repo.findBySyndicId(prisma, syndicId);
  if (!sub) throw new NotFoundError("Assinatura");
  const plan = await planRepo.findById(prisma, planId);
  if (!plan) throw new NotFoundError("Plano");

  const now = new Date();
  return repo.update(prisma, sub.id, {
    status: SubscriptionStatus.ACTIVE,
    currentPlan: { connect: { id: plan.id } },
    currentPeriodStart: now,
    currentPeriodEnd: addDays(now, periodEndDays),
    setupPaid: true, // manual assignment skips the setup fee requirement
    cancelledAt: null,
  });
}

export async function getPlatformMetrics(prisma: PrismaClient) {
  const [statusCounts, mrrCents, trialsExpiring, overdue] = await Promise.all([
    repo.countByStatus(prisma),
    repo.sumActiveMrrCents(prisma),
    repo.findTrialsExpiring(prisma, addDays(new Date(), 7)),
    repo.findOverdue(prisma),
  ]);

  const totalsByStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    totalsByStatus[row.status] = row._count._all;
  }

  return {
    mrrCents,
    counts: {
      trial: totalsByStatus.TRIAL ?? 0,
      active: totalsByStatus.ACTIVE ?? 0,
      cancelled: totalsByStatus.CANCELLED ?? 0,
      expired: totalsByStatus.EXPIRED ?? 0,
    },
    trialsExpiringCount: trialsExpiring.length,
    overdueCount: overdue.length,
    trialsExpiring,
    overdue,
  };
}
