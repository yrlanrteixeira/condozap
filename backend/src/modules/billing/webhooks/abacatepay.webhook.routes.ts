import type { FastifyPluginAsync } from "fastify";
import { handleAbacatePayWebhook } from "./abacatepay.webhook.controller";

export const abacatepayWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Public — no auth guard. Path contains a secret validated in the handler.
  fastify.post("/abacatepay/:secret", handleAbacatePayWebhook);
};
