import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  getAllHistoryHandler,
  getHistoryByCondominiumHandler,
  getHistoryLogByIdHandler,
} from "./history.controller";

export const historyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    getAllHistoryHandler
  );

  fastify.get(
    "/logs/:logId",
    {
      onRequest: [fastify.authenticate],
    },
    getHistoryLogByIdHandler
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    getHistoryByCondominiumHandler
  );
};
