import type { Prisma, PrismaClient } from "@prisma/client";

export const findBySyndicId = (prisma: PrismaClient, syndicId: string) =>
  prisma.subscription.findUnique({
    where: { syndicId },
    include: { currentPlan: true },
  });

export const findById = (prisma: PrismaClient, id: string) =>
  prisma.subscription.findUnique({
    where: { id },
    include: { currentPlan: true },
  });

export const create = (
  prisma: PrismaClient,
  data: Prisma.SubscriptionCreateInput,
) => prisma.subscription.create({ data, include: { currentPlan: true } });

export const update = (
  prisma: PrismaClient,
  id: string,
  data: Prisma.SubscriptionUpdateInput,
) => prisma.subscription.update({
  where: { id },
  data,
  include: { currentPlan: true },
});

export const listAll = async (
  prisma: PrismaClient,
  take = 100,
  skip = 0,
) => {
  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      include: {
        currentPlan: true,
        syndic: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.subscription.count(),
  ]);
  return { items, total };
};

export const countByStatus = (prisma: PrismaClient) =>
  prisma.subscription.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

export const sumActiveMrrCents = async (
  prisma: PrismaClient,
): Promise<number> => {
  // Sum of pricePerCondoCents × condo count for every ACTIVE subscription.
  // Uses a raw query for efficiency; returns 0 when there are no active subs.
  const rows = await prisma.$queryRaw<Array<{ total: bigint | null }>>`
    SELECT COALESCE(SUM(
      p.price_per_condo_cents * (
        SELECT COUNT(*)::int FROM condominiums c WHERE c.primary_syndic_id = s.syndic_id
      )
    ), 0)::bigint AS total
    FROM subscriptions s
    JOIN plans p ON p.id = s.current_plan_id
    WHERE s.status = 'ACTIVE'
  `;
  const total = rows[0]?.total ?? BigInt(0);
  return Number(total);
};

export const findTrialsExpiring = (
  prisma: PrismaClient,
  beforeDate: Date,
) =>
  prisma.subscription.findMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { gt: new Date(), lte: beforeDate },
    },
    include: {
      syndic: { select: { id: true, name: true, email: true } },
    },
    orderBy: { trialEndsAt: "asc" },
  });

export const findOverdue = (prisma: PrismaClient) =>
  prisma.subscription.findMany({
    where: {
      OR: [
        { status: "TRIAL", trialEndsAt: { lt: new Date() } },
        { status: "ACTIVE", currentPeriodEnd: { lt: new Date() } },
      ],
    },
    include: {
      syndic: { select: { id: true, name: true, email: true } },
      currentPlan: true,
    },
    orderBy: { updatedAt: "desc" },
  });
