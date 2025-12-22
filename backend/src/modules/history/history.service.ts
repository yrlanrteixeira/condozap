import { PrismaClient } from "@prisma/client";

export async function getAllHistory(
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
    include: {
      complaint: {
        include: {
          condominium: {
            select: {
              id: true,
              name: true,
            },
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
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function getHistoryByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  return prisma.complaintStatusHistory.findMany({
    where: {
      complaint: {
        condominiumId,
      },
    },
    include: {
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
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}
