import { FastifyPluginAsync } from "fastify";
import {
  listMessagesHandler,
  sendMessageHandler,
} from "./messages.controller";

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    listMessagesHandler
  );

  fastify.post(
    "/send",
    {
      onRequest: [fastify.authenticate],
    },
    sendMessageHandler
  );
};
