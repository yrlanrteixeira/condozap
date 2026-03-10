import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { resolveAccessContext, isCondominiumAllowed } from "../../auth/context";
import { isSuperAdmin } from "../../auth/roles";
import type { AuthUser } from "../../types/auth";
import {
  messageIdParamSchema,
  messageStatsQuerySchema,
  messagesParamsSchema,
  messagesQuerySchema,
  sendMessageSchema,
  type MessagesParams,
  type MessagesQuery,
  type SendMessageBody,
} from "./messages.schema";
import { getMessageById, getMessageStats, listMessages, sendMessage } from "./messages.service";

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

export async function getMessageDetailHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = messageIdParamSchema.parse(request.params);
  const message = await getMessageById(prisma, id);

  if (!message) {
    return reply.status(404).send({ error: "Mensagem não encontrada" });
  }

  const user = request.user as AuthUser;
  if (!isSuperAdmin(user.role)) {
    const context = await resolveAccessContext(prisma, {
      id: user.id,
      role: user.role,
      permissionScope: user.permissionScope as any,
    });
    if (!isCondominiumAllowed(context, message.condominiumId)) {
      return reply.status(403).send({ error: "Acesso negado ao condomínio da mensagem" });
    }
  }

  return reply.send(message);
}

export async function getMessageStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId, startDate, endDate } = messageStatsQuerySchema.parse(
    request.query
  );

  const stats = await getMessageStats(prisma, condominiumId, startDate, endDate);
  return reply.send(stats);
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

