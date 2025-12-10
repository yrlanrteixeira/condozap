import { PrismaClient } from "@prisma/client";

export async function findMessages(
  prisma: PrismaClient,
  condominiumId: string,
  limit: number
) {
  return prisma.message.findMany({
    where: { condominiumId },
    orderBy: { sentAt: "desc" },
    take: limit,
  });
}

export async function findTargetResidents(
  prisma: PrismaClient,
  data: {
    condominiumId: string;
    scope: "ALL" | "TOWER" | "FLOOR" | "UNIT";
    tower?: string;
    floor?: string;
    unit?: string;
  }
) {
  return prisma.resident.findMany({
    where: {
      condominiumId: data.condominiumId,
      consentWhatsapp: true,
      ...(data.scope === "TOWER" && { tower: data.tower }),
      ...(data.scope === "FLOOR" && {
        tower: data.tower,
        floor: data.floor,
      }),
      ...(data.scope === "UNIT" && {
        tower: data.tower,
        floor: data.floor,
        unit: data.unit,
      }),
    },
  });
}

export async function createMessageLog(
  prisma: PrismaClient,
  data: {
    condominiumId: string;
    type: "TEXT" | "TEMPLATE" | "IMAGE";
    scope: "ALL" | "TOWER" | "FLOOR" | "UNIT";
    targetTower?: string;
    targetFloor?: string;
    targetUnit?: string;
    content: string;
    recipientCount: number;
    sentBy: string;
    whatsappStatus: string;
  }
) {
  return prisma.message.create({
    data,
  });
}

