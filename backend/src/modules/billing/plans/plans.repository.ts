import type { Prisma, PrismaClient } from "@prisma/client";

export const findAllActive = (prisma: PrismaClient) =>
  prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

export const findAll = (prisma: PrismaClient) =>
  prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });

export const findById = (prisma: PrismaClient, id: string) =>
  prisma.plan.findUnique({ where: { id } });

export const findBySlug = (prisma: PrismaClient, slug: string) =>
  prisma.plan.findUnique({ where: { slug } });

export const create = (prisma: PrismaClient, data: Prisma.PlanCreateInput) =>
  prisma.plan.create({ data });

export const update = (
  prisma: PrismaClient,
  id: string,
  data: Prisma.PlanUpdateInput,
) => prisma.plan.update({ where: { id }, data });

export const countActiveSubscriptions = (prisma: PrismaClient, planId: string) =>
  prisma.subscription.count({
    where: { currentPlanId: planId, status: "ACTIVE" },
  });
