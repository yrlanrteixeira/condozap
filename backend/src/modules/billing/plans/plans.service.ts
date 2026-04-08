import type { PrismaClient } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../../../shared/errors";
import * as repo from "./plans.repository";
import type { CreatePlanRequest, UpdatePlanRequest } from "./plans.schema";

function validateRange(
  minCondominiums: number,
  maxCondominiums: number,
): void {
  if (maxCondominiums !== -1 && maxCondominiums < minCondominiums) {
    throw new BadRequestError(
      "maxCondominiums deve ser -1 (ilimitado) ou maior ou igual a minCondominiums",
    );
  }
}

export const listActivePlans = (prisma: PrismaClient) => repo.findAllActive(prisma);

export const listAllPlans = (prisma: PrismaClient) => repo.findAll(prisma);

export async function getPlan(prisma: PrismaClient, id: string) {
  const plan = await repo.findById(prisma, id);
  if (!plan) throw new NotFoundError("Plano");
  return plan;
}

export async function createPlan(
  prisma: PrismaClient,
  data: CreatePlanRequest,
) {
  validateRange(data.minCondominiums, data.maxCondominiums);

  const existing = await repo.findBySlug(prisma, data.slug);
  if (existing) throw new ConflictError("Slug do plano já existe");

  return repo.create(prisma, {
    slug: data.slug,
    displayName: data.displayName,
    minCondominiums: data.minCondominiums,
    maxCondominiums: data.maxCondominiums,
    pricePerCondoCents: data.pricePerCondoCents,
    setupFeeCents: data.setupFeeCents,
    sortOrder: data.sortOrder,
  });
}

export async function updatePlan(
  prisma: PrismaClient,
  id: string,
  data: UpdatePlanRequest,
) {
  const plan = await repo.findById(prisma, id);
  if (!plan) throw new NotFoundError("Plano");

  const nextMin = data.minCondominiums ?? plan.minCondominiums;
  const nextMax = data.maxCondominiums ?? plan.maxCondominiums;
  validateRange(nextMin, nextMax);

  if (data.slug && data.slug !== plan.slug) {
    const clash = await repo.findBySlug(prisma, data.slug);
    if (clash) throw new ConflictError("Slug do plano já existe");
  }

  return repo.update(prisma, id, {
    ...(data.slug !== undefined && { slug: data.slug }),
    ...(data.displayName !== undefined && { displayName: data.displayName }),
    ...(data.minCondominiums !== undefined && { minCondominiums: data.minCondominiums }),
    ...(data.maxCondominiums !== undefined && { maxCondominiums: data.maxCondominiums }),
    ...(data.pricePerCondoCents !== undefined && { pricePerCondoCents: data.pricePerCondoCents }),
    ...(data.setupFeeCents !== undefined && { setupFeeCents: data.setupFeeCents }),
    ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
  });
}

export async function deactivatePlan(prisma: PrismaClient, id: string) {
  const plan = await repo.findById(prisma, id);
  if (!plan) throw new NotFoundError("Plano");
  const activeCount = await repo.countActiveSubscriptions(prisma, id);
  return {
    plan: await repo.update(prisma, id, { isActive: false }),
    warning:
      activeCount > 0
        ? `Atenção: ${activeCount} assinatura(s) ativa(s) ainda referenciam esse plano. As cobranças do próximo ciclo vão falhar se não houver um tier equivalente.`
        : null,
  };
}
