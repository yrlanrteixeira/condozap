import { PrismaClient } from "@prisma/client";

export async function getAllMetricsData(prisma: PrismaClient) {
  return Promise.all([
    prisma.complaint.findMany({
      select: {
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
        resident: {
          select: {
            tower: true,
          },
        },
      },
    }),
    prisma.resident.findMany({
      select: {
        tower: true,
        type: true,
        consentWhatsapp: true,
      },
    }),
    prisma.message.findMany({
      select: {
        recipientCount: true,
        whatsappStatus: true,
        sentAt: true,
      },
    }),
  ]);
}

export async function getCondominiumMetricsData(
  prisma: PrismaClient,
  condominiumId: string
) {
  return Promise.all([
    prisma.complaint.findMany({
      where: { condominiumId },
      select: {
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
        resident: {
          select: {
            tower: true,
          },
        },
      },
    }),
    prisma.resident.findMany({
      where: { condominiumId },
      select: {
        tower: true,
        type: true,
        consentWhatsapp: true,
      },
    }),
    prisma.message.findMany({
      where: { condominiumId },
      select: {
        recipientCount: true,
        whatsappStatus: true,
        sentAt: true,
      },
    }),
  ]);
}

export async function findCondominiumsByIds(
  prisma: PrismaClient,
  condominiumIds: string[]
) {
  return prisma.condominium.findMany({
    where: { id: { in: condominiumIds } },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function findComplaintsByCondominiumIds(
  prisma: PrismaClient,
  condominiumIds: string[]
) {
  return prisma.complaint.findMany({
    where: { condominiumId: { in: condominiumIds } },
    select: {
      id: true,
      condominiumId: true,
      category: true,
      content: true,
      status: true,
      priority: true,
      createdAt: true,
      resident: {
        select: {
          name: true,
        },
      },
      condominium: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

