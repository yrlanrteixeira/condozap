import { FastifyPluginAsync } from "fastify";
import {
  sendBulkWhatsAppHandler,
  sendWhatsAppHandler,
  verifyWebhookHandler,
  webhookReceiverHandler,
} from "./whatsapp.controller";

export const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/webhook", verifyWebhookHandler);
  fastify.post("/webhook", webhookReceiverHandler);

  fastify.post(
    "/send",
    {
      onRequest: [fastify.authenticate],
    },
    sendWhatsAppHandler
  );

  fastify.post(
    "/send-bulk",
    {
      onRequest: [fastify.authenticate],
    },
    sendBulkWhatsAppHandler
  );
};
