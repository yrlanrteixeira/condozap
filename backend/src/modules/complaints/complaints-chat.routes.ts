import type { FastifyPluginAsync } from "fastify";
import {
  listComplaintMessagesHandler,
  sendComplaintMessageHandler,
} from "./complaints-chat.controller";

export const complaintChatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:complaintId",
    { onRequest: [fastify.authenticate] },
    listComplaintMessagesHandler
  );

  fastify.post(
    "/:complaintId",
    { onRequest: [fastify.authenticate] },
    sendComplaintMessageHandler
  );
};
