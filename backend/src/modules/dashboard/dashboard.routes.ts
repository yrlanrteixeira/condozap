import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../shared/middlewares";
import {
  getAllMetricsHandler,
  getCondominiumMetricsHandler,
  getUnifiedDashboardHandler,
} from "./dashboard.controller";

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/metrics/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    getAllMetricsHandler
  );

  fastify.get(
    "/metrics/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    getCondominiumMetricsHandler
  );

  fastify.get(
    "/unified",
    {
      onRequest: [fastify.authenticate],
    },
    getUnifiedDashboardHandler
  );
};
