import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
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
import {
  sendAndRecordMessage,
  sendBulkAndRecordMessages,
  updateMessageStatuses,
} from "./whatsapp.service";

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

/**
 * Verifies Meta's `x-hub-signature-256` header against the raw body using
 * HMAC-SHA256 with WHATSAPP_APP_SECRET. Constant-time compare to avoid
 * timing leaks. Returns false (and never throws) on any malformed input.
 */
const verifyMetaSignature = (
  rawBody: Buffer | string | undefined,
  headerValue: string | undefined,
  secret: string | undefined
): boolean => {
  if (!secret || !headerValue || !rawBody) return false;
  if (!headerValue.startsWith("sha256=")) return false;

  const provided = headerValue.slice("sha256=".length);
  const bodyBuf =
    typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(bodyBuf)
    .digest("hex");

  // timingSafeEqual requires equal-length buffers
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
};

export const webhookReceiverHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const signature = request.headers["x-hub-signature-256"] as
    | string
    | undefined;
  const rawBody = (request as FastifyRequest & {
    rawBody?: Buffer | string;
  }).rawBody;

  if (
    !verifyMetaSignature(rawBody, signature, config.WHATSAPP_APP_SECRET)
  ) {
    // Meta convention: never leak why we rejected; reply 200 and skip work.
    request.log.warn(
      {
        ip: request.ip,
        hasSignature: Boolean(signature),
        hasSecret: Boolean(config.WHATSAPP_APP_SECRET),
      },
      "whatsapp webhook rejected: invalid or missing HMAC signature"
    );
    return reply.send({ success: true });
  }

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
  const userId = (request.user as any).id;

  try {
    const result = await sendAndRecordMessage(
      prisma,
      request.log,
      body,
      userId
    );
    return reply.send(result);
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
  const userId = (request.user as any).id;

  try {
    const result = await sendBulkAndRecordMessages(
      prisma,
      request.log,
      body,
      userId
    );
    return reply.send(result);
  } catch (error: any) {
    request.log.error({ error }, "Failed to send bulk WhatsApp messages");
    return reply.status(500).send({ error: error.message });
  }
};

