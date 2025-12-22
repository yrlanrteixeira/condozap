import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../../config/env";
import { prisma } from "../../shared/db/prisma";
import {
  webhookVerifyQuerySchema,
  whatsappWebhookBodySchema,
  type WebhookVerifyQuery,
  type WhatsAppWebhookBody,
} from "./whatsapp.schema";
import { updateMessageStatuses } from "./whatsapp.service";

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

