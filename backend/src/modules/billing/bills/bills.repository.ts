import type { Prisma, PrismaClient } from "@prisma/client";

export const findById = (prisma: PrismaClient, id: string) =>
  prisma.paymentBill.findUnique({ where: { id } });

export const findByExternalId = (
  prisma: PrismaClient,
  providerId: string,
  externalId: string,
) =>
  prisma.paymentBill.findFirst({
    where: { providerId, externalId },
  });

export const listBySubscription = (
  prisma: PrismaClient,
  subscriptionId: string,
  take = 20,
) =>
  prisma.paymentBill.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" },
    take,
  });

export const create = (
  prisma: PrismaClient,
  data: Prisma.PaymentBillCreateInput,
) => prisma.paymentBill.create({ data });

export const update = (
  prisma: PrismaClient,
  id: string,
  data: Prisma.PaymentBillUpdateInput,
) => prisma.paymentBill.update({ where: { id }, data });

export const findPendingForSubscription = (
  prisma: PrismaClient,
  subscriptionId: string,
) =>
  prisma.paymentBill.findFirst({
    where: { subscriptionId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
