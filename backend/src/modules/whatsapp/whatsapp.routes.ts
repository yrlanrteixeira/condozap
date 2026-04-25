import { FastifyPluginAsync } from "fastify";
import { requireCondoAccess } from "../../auth/authorize";
import {
  sendBulkWhatsAppHandler,
  sendWhatsAppHandler,
  verifyWebhookHandler,
  webhookReceiverHandler,
} from "./whatsapp.controller";

export const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/webhook", verifyWebhookHandler);
  fastify.post(
    "/webhook",
    {
      // 300/min per IP — comfortably above Meta's burst rate, throttles abuse.
      config: {
        rawBody: true,
        rateLimit: {
          max: 300,
          timeWindow: "1 minute",
        },
      },
    },
    webhookReceiverHandler
  );

  fastify.post(
    "/send",
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireCondoAccess({ source: "body" })],
    },
    sendWhatsAppHandler
  );

  fastify.post(
    "/send-bulk",
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireCondoAccess({ source: "body" })],
    },
    sendBulkWhatsAppHandler
  );
};
