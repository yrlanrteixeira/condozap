import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../shared/db/prisma";
import type { AuthUser } from "../../../types/auth";
import {
  toPublicPlanDto,
  toPublicSubscriptionDto,
} from "../lib/dtos";
import {
  assignPlanSchema,
  extendTrialSchema,
  reactivateSchema,
} from "./subscriptions.schema";
import * as service from "./subscriptions.service";
import { resolveSubscriptionState } from "../lib/subscription-state";

export async function getMySubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthUser;
  const result = await service.getMySubscription(prisma, user.id);
  if (!result) return reply.send(null);
  return reply.send(toPublicSubscriptionDto(result.sub, result.state));
}

export async function listSubscriptionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const q = request.query as { take?: string; skip?: string };
  const take = q.take ? parseInt(q.take, 10) : 100;
  const skip = q.skip ? parseInt(q.skip, 10) : 0;
  const { items, total } = await service.listAllSubscriptions(prisma, take, skip);
  return reply.send({
    total,
    items: items.map((sub) => ({
      ...toPublicSubscriptionDto(sub, resolveSubscriptionState(sub)),
      syndic: sub.syndic,
    })),
  });
}

export async function getSubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { syndicId } = request.params as { syndicId: string };
  const { sub, state } = await service.getSubscriptionBySyndicId(prisma, syndicId);
  return reply.send(toPublicSubscriptionDto(sub, state));
}

export async function extendTrialHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { syndicId } = request.params as { syndicId: string };
  const body = extendTrialSchema.parse(request.body);
  const sub = await service.extendTrial(prisma, syndicId, body.days);
  const state = resolveSubscriptionState(sub);
  return reply.send(toPublicSubscriptionDto(sub, state));
}

export async function cancelSubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { syndicId } = request.params as { syndicId: string };
  const sub = await service.cancelSubscription(prisma, syndicId);
  const state = resolveSubscriptionState(sub);
  return reply.send(toPublicSubscriptionDto(sub, state));
}

export async function reactivateSubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { syndicId } = request.params as { syndicId: string };
  const body = reactivateSchema.parse(request.body);
  const sub = await service.reactivateSubscription(prisma, syndicId, body.periodEndDays);
  const state = resolveSubscriptionState(sub);
  return reply.send(toPublicSubscriptionDto(sub, state));
}

export async function assignPlanHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { syndicId } = request.params as { syndicId: string };
  const body = assignPlanSchema.parse(request.body);
  const sub = await service.assignPlanManually(
    prisma,
    syndicId,
    body.planId,
    body.periodEndDays,
  );
  const state = resolveSubscriptionState(sub);
  return reply.send(toPublicSubscriptionDto(sub, state));
}

export async function getPlatformMetricsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const metrics = await service.getPlatformMetrics(prisma);
  return reply.send({
    mrrCents: metrics.mrrCents,
    counts: metrics.counts,
    trialsExpiring: metrics.trialsExpiring.map((sub) => ({
      ...toPublicSubscriptionDto(sub, resolveSubscriptionState(sub)),
      syndic: sub.syndic,
    })),
    overdue: metrics.overdue.map((sub) => ({
      ...toPublicSubscriptionDto(sub, resolveSubscriptionState(sub)),
      syndic: sub.syndic,
      plan: sub.currentPlan ? toPublicPlanDto(sub.currentPlan) : null,
    })),
  });
}
