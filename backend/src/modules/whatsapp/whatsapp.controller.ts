import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../../config/env";
import { prisma } from "../../shared/db/prisma";
import {
  sendBulkWhatsAppSchema,
  sendWhatsAppSchema,
  webhookVerifyQuerySchema,
  whatsappWebhookBodySchema,
  type SendBulkWhatsAppBody,
  type SendWhatsAppBody,
  type WebhookVerifyQuery,
  type WhatsAppWebhookBody,
} from "./whatsapp.schema";
import { updateMessageStatuses, whatsappService } from "./whatsapp.service";

export const verifyWebhookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const query = webhookVerifyQuerySchema.parse(
    request.query
  ) as WebhookVerifyQuery;
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  if (mode === "subscribe" && token === config.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    request.log.info("Webhook verified successfully");
    return reply.send(challenge ?? "");
  }
  return reply.status(403).send("Forbidden");
};

export const webhookReceiverHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const body = whatsappWebhookBodySchema.parse(
    request.body
  ) as WhatsAppWebhookBody;
  await updateMessageStatuses(prisma, body, request.log);
  return reply.send({ success: true });
};

export const sendWhatsAppHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const body = sendWhatsAppSchema.parse(request.body) as SendWhatsAppBody;

  try {
    const result = await whatsappService.sendTextMessage(body.to, body.message);

    await prisma.message.create({
      data: {
        condominiumId: body.condominiumId,
        type: "TEXT",
        scope: "UNIT",
        content: body.message,
        recipientCount: 1,
        sentBy: (request.user as any).id,
        whatsappStatus: "SENT",
        whatsappMessageId: result.messageId,
      },
    });

    return reply.send({ success: true, messageId: result.messageId });
  } catch (error: any) {
    request.log.error({ error }, "Failed to send WhatsApp message");
    return reply.status(500).send({ error: error.message });
  }
};

export const sendBulkWhatsAppHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const body = sendBulkWhatsAppSchema.parse(request.body) as SendBulkWhatsAppBody;

  try {
    const result = await whatsappService.sendBulkMessages({
      recipients: body.recipients.map((r) => ({
        phone: r.phone,
        name: r.name || "",
      })),
      message: body.message,
    });

    await prisma.message.create({
      data: {
        condominiumId: body.condominiumId,
        type: "TEXT",
        scope: "ALL",
        content: body.message,
        recipientCount: result.total,
        sentBy: (request.user as any).id,
        whatsappStatus: result.sent > 0 ? "SENT" : "FAILED",
      },
    });

    return reply.send({
      success: true,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      results: result.results,
    });
  } catch (error: any) {
    request.log.error({ error }, "Failed to send bulk WhatsApp messages");
    return reply.status(500).send({ error: error.message });
  }
};

