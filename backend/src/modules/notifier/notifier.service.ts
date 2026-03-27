import type { PrismaClient, Prisma } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import type { NotificationEvent, NotifyResult } from "./notifier.types";
import { buildTemplate } from "./notifier.templates";
import { sendAndRecordMessage } from "../whatsapp/whatsapp.service";

function getPhoneFromEvent(event: NotificationEvent): string | null {
  switch (event.type) {
    case "complaint_created":
      return event.residentPhone;
    case "complaint_status_changed":
      return event.residentPhone;
    case "complaint_assigned":
      return event.assigneePhone;
    case "complaint_comment":
      return event.recipientPhone;
    case "sla_warning":
      return event.syndicPhone;
    case "sla_escalation":
      return event.syndicPhone;
    case "csat_request":
      return event.residentPhone;
    case "approval_pending":
      return event.syndicPhone;
  }
}

export async function notify(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  event: NotificationEvent,
  targetUserId: string,
  condominiumId?: string
): Promise<NotifyResult> {
  const template = buildTemplate(event);

  // Create in-app Notification record
  const inApp: NotifyResult["inApp"] = { created: false };
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: template.inAppType,
        title: template.inAppTitle,
        body: template.inAppBody,
        data: event as unknown as Prisma.InputJsonValue,
      },
    });
    inApp.created = true;
    inApp.notificationId = notification.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, event }, `notifier: failed to create in-app notification — ${message}`);
  }

  // Send WhatsApp message (best-effort, only when condominiumId is provided)
  const whatsapp: NotifyResult["whatsapp"] = { sent: false };
  if (condominiumId) {
    const phone = getPhoneFromEvent(event);
    if (phone) {
      try {
        const result = await sendAndRecordMessage(
          prisma,
          logger,
          { to: phone, message: template.whatsappMessage, condominiumId },
          "system"
        );
        whatsapp.sent = true;
        whatsapp.messageId = result.messageId;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, event }, `notifier: failed to send WhatsApp message — ${message}`);
        whatsapp.error = message;
      }
    }
  }

  return { whatsapp, inApp };
}
