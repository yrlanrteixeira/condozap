import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { resolveAccessContext, isCondominiumAllowed } from "../../auth/context";
import type { AuthUser } from "../../types/auth";
import {
  historyLogIdParamSchema,
  historyParamsSchema,
  historyQuerySchema,
  type HistoryLogIdParams,
  type HistoryParams,
  type HistoryQueryAll,
} from "./history.schema";
import { getAllHistory, getHistoryByCondominium, getHistoryLogById } from "./history.service";

export async function getAllHistoryHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = historyQuerySchema.parse(
    request.query
  ) as HistoryQueryAll;

  const history = await getAllHistory(prisma, condominiumId);

  return reply.send(history);
}

export async function getHistoryLogByIdHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { logId } = historyLogIdParamSchema.parse(
    request.params
  ) as HistoryLogIdParams;

  const log = await getHistoryLogById(prisma, logId);

  if (!log) {
    return reply.status(404).send({ error: "Log não encontrado" });
  }

  const user = request.user as AuthUser;
  if (log.complaint) {
    const context = await resolveAccessContext(prisma, {
      id: user.id,
      role: user.role,
      permissionScope: user.permissionScope as any,
    });
    if (!isCondominiumAllowed(context, log.complaint.condominiumId)) {
      return reply.status(403).send({ error: "Acesso negado ao condomínio do log" });
    }
  }

  return reply.send(log);
}

export async function getHistoryByCondominiumHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = historyParamsSchema.parse(
    request.params
  ) as HistoryParams;

  const history = await getHistoryByCondominium(prisma, condominiumId);

  return reply.send(history);
}
