import type { FastifyPluginAsync } from "fastify";
import {
  listComplaintMessagesHandler,
  sendComplaintMessageHandler,
  sseComplaintMessagesHandler,
} from "./complaints-chat.controller";

export const complaintChatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:complaintId",
    { onRequest: [fastify.authenticate] },
    listComplaintMessagesHandler
  );

  fastify.get(
    "/:complaintId/stream",
    { onRequest: [fastify.authenticate] },
    sseComplaintMessagesHandler
  );

  fastify.post(
    "/:complaintId",
    {
      onRequest: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    sendComplaintMessageHandler
  );
};
