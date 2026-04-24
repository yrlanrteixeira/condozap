import type { FastifyPluginAsync } from "fastify";
import { handleAbacatePayWebhook } from "./abacatepay.webhook.controller";

export const abacatepayWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Public — no auth guard. Path contains a secret validated in the handler.
  // Rate-limited (300 req/min per IP) to absorb provider retry storms while
  // still throttling abusive clients hammering the public endpoint.
  fastify.post(
    "/abacatepay/:secret",
    {
      config: {
        rateLimit: {
          max: 300,
          timeWindow: "1 minute",
        },
      },
    },
    handleAbacatePayWebhook
  );
};
