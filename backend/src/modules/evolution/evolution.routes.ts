import { FastifyPluginAsync } from "fastify";
import {
  checkNumbersHandler,
  disconnectHandler,
  getQRCodeHandler,
  getStatusHandler,
  restartHandler,
  sendTextHandler,
  webhookHandler,
} from "./evolution.controller";
import { requireRole } from "../../shared/middlewares";
import { config } from "../../config/env";

const adminRoles = ["SYNDIC", "PROFESSIONAL_SYNDIC", "SUPER_ADMIN"];

/**
 * Validates the inbound Evolution webhook shared secret.
 * Accepts either `apikey` or `x-evolution-token` header (legacy + canonical).
 * Returns 401 if header is absent or does not match EVOLUTION_API_KEY.
 *
 * If EVOLUTION_API_KEY is not configured, the webhook is left open with a WARN
 * (dev/test convenience) — production deployments MUST set EVOLUTION_API_KEY.
 */
const requireEvolutionWebhookSecret = async (request: any, reply: any) => {
  const expected = config.EVOLUTION_API_KEY;
  if (!expected) {
    request.log.warn(
      "Evolution webhook called without EVOLUTION_API_KEY configured — accepting (dev mode)"
    );
    return;
  }
  const provided =
    (request.headers["apikey"] as string | undefined) ||
    (request.headers["x-evolution-token"] as string | undefined);
  if (!provided || provided !== expected) {
    request.log.warn(
      { hasHeader: Boolean(provided) },
      "Evolution webhook rejected: invalid or missing shared secret"
    );
    return reply.status(401).send({ error: "Unauthorized" });
  }
};

export const evolutionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/status",
    {
      onRequest: [fastify.authenticate],
    },
    getStatusHandler
  );

  fastify.get(
    "/qrcode",
    {
      onRequest: [fastify.authenticate],
    },
    getQRCodeHandler
  );

  fastify.post(
    "/disconnect",
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole(adminRoles)],
    },
    disconnectHandler
  );

  fastify.post(
    "/restart",
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole(adminRoles)],
    },
    restartHandler
  );

  fastify.post(
    "/send",
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole(adminRoles)],
    },
    sendTextHandler
  );

  fastify.post(
    "/check-numbers",
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireRole(adminRoles)],
    },
    checkNumbersHandler
  );

  fastify.post(
    "/webhook",
    {
      preHandler: [requireEvolutionWebhookSecret],
    },
    webhookHandler
  );
};
