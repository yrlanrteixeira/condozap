import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  historyParamsSchema,
  historyQuerySchema,
  type HistoryParams,
  type HistoryQueryAll,
} from "./history.schema";
import { getAllHistory, getHistoryByCondominium } from "./history.service";

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
