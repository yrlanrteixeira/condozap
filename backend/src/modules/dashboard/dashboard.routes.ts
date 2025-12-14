import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
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
      onRequest: [fastify.authenticate, requireCondoAccess()],
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
