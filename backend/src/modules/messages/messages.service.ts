import { PrismaClient } from "@prisma/client";
import { messagingService } from "../messaging";
import type { SendMessageBody } from "./messages.schema";

export async function listMessages(
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
    whatsappStatus?: "SENT" | "FAILED" | "DELIVERED" | "READ";
  }
) {
  return prisma.message.create({
    data,
  });
}

export async function sendMessage(
  prisma: PrismaClient,
  userId: string,
  body: SendMessageBody
) {
  const residents = await findTargetResidents(prisma, {
    condominiumId: body.condominium_id,
    scope: body.target.scope,
    tower: body.target.tower,
    floor: body.target.floor,
    unit: body.target.unit,
  });

  if (residents.length === 0) {
    return { status: 400, payload: { error: "No recipients found" } };
  }

  const result = await messagingService.sendBulk({
    recipients: residents.map((resident) => ({
      phone: resident.phone,
      name: resident.name,
    })),
    message: body.content.text,
  });

  const message = await createMessageLog(prisma, {
    condominiumId: body.condominium_id,
    type: body.type,
    scope: body.target.scope,
    targetTower: body.target.tower,
    targetFloor: body.target.floor,
    targetUnit: body.target.unit,
    content: body.content.text,
    recipientCount: result.total,
    sentBy: body.sentBy || userId,
    whatsappStatus: result.sent > 0 ? "SENT" : "FAILED",
  });

  return { status: 200, payload: { message, sendResult: result } };
}
