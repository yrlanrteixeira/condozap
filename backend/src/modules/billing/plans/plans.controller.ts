import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../shared/db/prisma";
import { toPublicPlanDto } from "../lib/dtos";
import * as service from "./plans.service";
import {
  createPlanSchema,
  updatePlanSchema,
} from "./plans.schema";

export async function listActivePlansHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const plans = await service.listActivePlans(prisma);
  return reply.send(plans.map(toPublicPlanDto));
}

export async function listAllPlansHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const plans = await service.listAllPlans(prisma);
  return reply.send(plans.map(toPublicPlanDto));
}

export async function getPlanHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const plan = await service.getPlan(prisma, id);
  return reply.send(toPublicPlanDto(plan));
}

export async function createPlanHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createPlanSchema.parse(request.body);
  const plan = await service.createPlan(prisma, body);
  return reply.status(201).send(toPublicPlanDto(plan));
}

export async function updatePlanHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const body = updatePlanSchema.parse(request.body);
  const plan = await service.updatePlan(prisma, id, body);
  return reply.send(toPublicPlanDto(plan));
}

export async function deactivatePlanHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };
  const result = await service.deactivatePlan(prisma, id);
  return reply.send({
    plan: toPublicPlanDto(result.plan),
    warning: result.warning,
  });
}
