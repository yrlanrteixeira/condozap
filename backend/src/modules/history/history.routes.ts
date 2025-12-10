import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma";
import { requireSuperAdmin } from "../../middlewares";
import { historyParamsSchema, historyQuerySchema } from "./history.schemas";
import { getAllHistory, getHistoryByCondominium } from "./history.db";
import type { HistoryParams, HistoryQueryAll } from "./history.types";

export const historyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const { condominiumId } = historyQuerySchema.parse(
        request.query
      ) as HistoryQueryAll;

      const history = await getAllHistory(prisma, condominiumId);

      return reply.send(history);
    }
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = historyParamsSchema.parse(
        request.params
      ) as HistoryParams;

      const history = await getHistoryByCondominium(prisma, condominiumId);

      return reply.send(history);
    }
  );
};
