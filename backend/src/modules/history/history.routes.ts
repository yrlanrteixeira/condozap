import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../shared/middlewares";
import {
  getAllHistoryHandler,
  getHistoryByCondominiumHandler,
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
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    getHistoryByCondominiumHandler
  );
};
