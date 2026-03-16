import { PrismaClient } from "@prisma/client";

const complaintMetricsSelect = {
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
} as const;

const residentMetricsSelect = {
  tower: true,
  type: true,
  consentWhatsapp: true,
} as const;

const messageMetricsSelect = {
  recipientCount: true,
  whatsappStatus: true,
  sentAt: true,
} as const;

export async function findAllMetricsData(prisma: PrismaClient) {
  return Promise.all([
    prisma.complaint.findMany({
      select: complaintMetricsSelect,
    }),
    prisma.resident.findMany({
      select: residentMetricsSelect,
    }),
    prisma.message.findMany({
      select: messageMetricsSelect,
    }),
  ]);
}

export async function findMetricsDataByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  return Promise.all([
    prisma.complaint.findMany({
      where: { condominiumId },
      select: complaintMetricsSelect,
    }),
    prisma.resident.findMany({
      where: { condominiumId },
      select: residentMetricsSelect,
    }),
    prisma.message.findMany({
      where: { condominiumId },
      select: messageMetricsSelect,
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
