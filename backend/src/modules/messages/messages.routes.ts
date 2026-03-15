import { FastifyPluginAsync } from "fastify";
import { requireCondoAccess } from "../../auth/authorize";
import {
  getMessageDetailHandler,
  getMessageStatsHandler,
  listMessagesHandler,
  sendMessageHandler,
} from "./messages.controller";

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/stats",
    {
      onRequest: [fastify.authenticate, requireCondoAccess({ source: "query" })],
    },
    getMessageStatsHandler
  );

  fastify.get(
    "/detail/:id",
    {
      onRequest: [fastify.authenticate],
    },
    getMessageDetailHandler
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    listMessagesHandler
  );

  fastify.post(
    "/send",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ source: "body" }),
      ],
    },
    sendMessageHandler
  );
};
