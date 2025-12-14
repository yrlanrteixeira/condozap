import { FastifyPluginAsync } from "fastify";
import { requireCondoAccess } from "../../auth/authorize";
import { listMessagesHandler, sendMessageHandler } from "./messages.controller";

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
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
        requireCondoAccess("condominium_id", "body"),
      ],
    },
    sendMessageHandler
  );
};
