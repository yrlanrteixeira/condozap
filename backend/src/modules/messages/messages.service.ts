import { PrismaClient, ActivityType } from "@prisma/client";
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
import type { AccessContext } from "../../auth/context";
import { BadRequestError } from "../../shared/errors";
import { createActivityLog } from "../history/activity-log.service";

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
  body: SendMessageBody,
  context?: AccessContext
) {
  if (context?.assignedTower) {
    if (body.target.scope === "ALL") {
      throw new BadRequestError("Você só pode enviar mensagens para sua torre");
    }
    if (body.target.scope === "TOWER" && body.target.tower !== context.assignedTower) {
      throw new BadRequestError("Você só pode enviar mensagens para sua torre atribuída");
    }
  }

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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const activityType = result.failed === result.total ? ActivityType.MESSAGE_FAILED : ActivityType.MESSAGE_SENT;
  
  const targetLabel = getTargetLabel(body.target);
  
  await createActivityLog(prisma, {
    condominiumId: body.condominiumId,
    userId,
    userName: user?.name || undefined,
    type: activityType,
    description: `${result.sent}/${result.total} mensagens enviadas para ${targetLabel}`,
    metadata: {
      messageId: message.id,
      recipients: result.total,
      sent: result.sent,
      failed: result.failed,
      results: result.results?.map(r => ({
        phone: r.phone,
        success: r.success,
        error: r.error,
      })),
    },
    targetId: message.id,
    targetType: "Message",
    status: result.failed === result.total ? "failed" : "partial",
    errorMessage: result.failed > 0 ? `${result.failed} mensagens falharam` : undefined,
  });

  return { status: 200, payload: { message, sendResult: result } };
}

function getTargetLabel(target: SendMessageBody["target"]): string {
  switch (target.scope) {
    case "ALL":
      return "todos os moradores";
    case "TOWER":
      return `torre ${target.tower}`;
    case "FLOOR":
      return `andar ${target.floor}`;
    case "UNIT":
      return `unidade ${target.unit}`;
    default:
      return "destinatários";
  }
}
