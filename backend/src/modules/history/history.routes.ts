import { FastifyPluginAsync } from "fastify";
import { requireRole, requireGlobalScope } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  getAllHistoryHandler,
  getHistoryByCondominiumHandler,
  getHistoryLogByIdHandler,
  getActivityLogsHandler,
} from "./history.controller";

export const historyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireRole(["PROFESSIONAL_SYNDIC"]), requireGlobalScope()],
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
    "/activity/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    getActivityLogsHandler
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    getHistoryByCondominiumHandler
  );
};
