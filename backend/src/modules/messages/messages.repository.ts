import { PrismaClient } from "@prisma/client";

export interface MessageQueryFilters {
  condominiumId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TargetResidentFilters {
  condominiumId: string;
  scope: "ALL" | "TOWER" | "FLOOR" | "UNIT";
  tower?: string;
  floor?: string;
  unit?: string;
}

export interface CreateMessageData {
  condominiumId: string;
  type: "TEXT" | "TEMPLATE" | "IMAGE";
  scope: "ALL" | "TOWER" | "FLOOR" | "UNIT";
  targetTower?: string;
  targetFloor?: string;
  targetUnit?: string;
  content: string;
  recipientCount: number;
  sentBy: string;
  whatsappStatus?: "SENT" | "FAILED" | "DELIVERED" | "READ";
}

const buildDateWhere = (
  condominiumId: string,
  startDate?: Date,
  endDate?: Date
): Record<string, unknown> => {
  const where: Record<string, unknown> = { condominiumId };
  if (startDate || endDate) {
    where.sentAt = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }
  return where;
};

const buildScopeFilter = (
  filters: TargetResidentFilters
): Record<string, unknown> => ({
  condominiumId: filters.condominiumId,
  consentWhatsapp: true,
  ...(filters.scope === "TOWER" && { tower: filters.tower }),
  ...(filters.scope === "FLOOR" && {
    tower: filters.tower,
    floor: filters.floor,
  }),
  ...(filters.scope === "UNIT" && {
    tower: filters.tower,
    floor: filters.floor,
    unit: filters.unit,
  }),
});

export const findMessages = (
  prisma: PrismaClient,
  condominiumId: string,
  limit: number
) =>
  prisma.message.findMany({
    where: { condominiumId },
    orderBy: { sentAt: "desc" },
    take: limit,
  });

export const findTargetResidents = (
  prisma: PrismaClient,
  filters: TargetResidentFilters
) =>
  prisma.resident.findMany({
    where: buildScopeFilter(filters),
  });

export const createMessage = (
  prisma: PrismaClient,
  data: CreateMessageData
) =>
  prisma.message.create({
    data,
  });

export const findById = (prisma: PrismaClient, messageId: string) =>
  prisma.message.findUnique({
    where: { id: messageId },
  });

export const count = (
  prisma: PrismaClient,
  condominiumId: string,
  startDate?: Date,
  endDate?: Date
) =>
  prisma.message.count({
    where: buildDateWhere(condominiumId, startDate, endDate),
  });

export const groupByStatus = (
  prisma: PrismaClient,
  condominiumId: string,
  startDate?: Date,
  endDate?: Date
) =>
  prisma.message.groupBy({
    by: ["whatsappStatus"],
    where: buildDateWhere(condominiumId, startDate, endDate),
    _count: { id: true },
  });

export const groupByType = (
  prisma: PrismaClient,
  condominiumId: string,
  startDate?: Date,
  endDate?: Date
) =>
  prisma.message.groupBy({
    by: ["type"],
    where: buildDateWhere(condominiumId, startDate, endDate),
    _count: { id: true },
  });

export const aggregateRecipients = (
  prisma: PrismaClient,
  condominiumId: string,
  startDate?: Date,
  endDate?: Date
) =>
  prisma.message.aggregate({
    where: buildDateWhere(condominiumId, startDate, endDate),
    _sum: { recipientCount: true },
  });
