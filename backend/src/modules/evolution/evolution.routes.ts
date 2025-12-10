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
    },
    disconnectHandler
  );

  fastify.post(
    "/restart",
    {
      onRequest: [fastify.authenticate],
    },
    restartHandler
  );

  fastify.post(
    "/send",
    {
      onRequest: [fastify.authenticate],
    },
    sendTextHandler
  );

  fastify.post(
    "/check-numbers",
    {
      onRequest: [fastify.authenticate],
    },
    checkNumbersHandler
  );

  fastify.post("/webhook", webhookHandler);
};
