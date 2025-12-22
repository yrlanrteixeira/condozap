import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  messagesParamsSchema,
  messagesQuerySchema,
  sendMessageSchema,
  type MessagesParams,
  type MessagesQuery,
  type SendMessageBody,
} from "./messages.schema";
import { listMessages, sendMessage } from "./messages.service";

export async function listMessagesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = messagesParamsSchema.parse(
    request.params
  ) as MessagesParams;
  const { limit = 50 } = messagesQuerySchema.parse(
    request.query
  ) as MessagesQuery;

  const messages = await listMessages(prisma, condominiumId, Number(limit));

  return reply.send(messages);
}

export async function sendMessageHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = sendMessageSchema.parse(request.body) as SendMessageBody;
  const user = request.user as { id: string };

  const result = await sendMessage(prisma, user.id, body);

  if (result.status !== 200) {
    return reply.status(result.status).send(result.payload);
  }

  return reply.send(result.payload);
}

