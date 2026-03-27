import { PrismaClient } from "@prisma/client";
import { messagingService } from "../messaging";
import type { SendMessageBody } from "./messages.schema";
import {
  findMessages,
  findTargetResidents,
  createMessage,
  findById,
  count,
  groupByStatus,
  groupByType,
  aggregateRecipients,
} from "./messages.repository";

export async function listMessages(
  prisma: PrismaClient,
  condominiumId: string,
  limit: number
) {
  return findMessages(prisma, condominiumId, limit);
}

export async function getMessageById(
  prisma: PrismaClient,
  messageId: string
) {
  return findById(prisma, messageId);
}

export async function getMessageStats(
  prisma: PrismaClient,
  condominiumId: string,
  startDate?: Date,
  endDate?: Date
) {
  const [total, byStatus, byType] = await Promise.all([
    count(prisma, condominiumId, startDate, endDate),
    groupByStatus(prisma, condominiumId, startDate, endDate),
    groupByType(prisma, condominiumId, startDate, endDate),
  ]);

  const totalRecipients = await aggregateRecipients(
    prisma,
    condominiumId,
    startDate,
    endDate
  );

  return {
    total,
    totalRecipients: totalRecipients._sum.recipientCount || 0,
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.whatsappStatus || "UNKNOWN", s._count.id])
    ),
    byType: Object.fromEntries(
      byType.map((t) => [t.type, t._count.id])
    ),
  };
}

export async function sendMessage(
  prisma: PrismaClient,
  userId: string,
  body: SendMessageBody
) {
  const residents = await findTargetResidents(prisma, {
    condominiumId: body.condominiumId,
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
    message: body.content.text || body.caption || "",
    type: body.type === "IMAGE" ? "image" : "text",
    mediaUrl: body.mediaUrl,
    caption: body.caption,
  });

  const message = await createMessage(prisma, {
    condominiumId: body.condominiumId,
    type: body.type,
    scope: body.target.scope,
    targetTower: body.target.tower,
    targetFloor: body.target.floor,
    targetUnit: body.target.unit,
    content: body.mediaUrl ?? body.content.text,
    recipientCount: result.total,
    sentBy: body.sentBy || userId,
    whatsappStatus: result.sent > 0 ? "SENT" : "FAILED",
  });

  return { status: 200, payload: { message, sendResult: result } };
}
