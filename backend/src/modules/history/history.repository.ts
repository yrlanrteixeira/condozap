import { PrismaClient } from "@prisma/client";

const historyDetailIncludes = {
  complaint: {
    include: {
      condominium: {
        select: { id: true, name: true },
      },
      resident: {
        select: {
          id: true,
          name: true,
          tower: true,
          floor: true,
          unit: true,
        },
      },
    },
  },
} as const;

const historyByCondominiumIncludes = {
  complaint: {
    include: {
      resident: {
        select: {
          id: true,
          name: true,
          tower: true,
          floor: true,
          unit: true,
        },
      },
    },
  },
} as const;

export async function findHistoryLogById(
  prisma: PrismaClient,
  logId: string
) {
  return prisma.complaintStatusHistory.findUnique({
    where: { id: logId },
    include: historyDetailIncludes,
  });
}

export async function findAllHistory(
  prisma: PrismaClient,
  condominiumId?: string
) {
  return prisma.complaintStatusHistory.findMany({
    where: {
      ...(condominiumId && {
        complaint: {
          condominiumId,
        },
      }),
    },
    include: historyDetailIncludes,
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function findHistoryByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  return prisma.complaintStatusHistory.findMany({
    where: {
      complaint: {
        condominiumId,
      },
    },
    include: historyByCondominiumIncludes,
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}
