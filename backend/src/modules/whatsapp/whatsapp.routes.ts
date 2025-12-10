import { FastifyPluginAsync } from "fastify";
import {
  verifyWebhookHandler,
  webhookReceiverHandler,
} from "./whatsapp.controller";

export const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/webhook", verifyWebhookHandler);
  fastify.post("/webhook", webhookReceiverHandler);
};


