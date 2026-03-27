import { FastifyPluginAsync } from "fastify";
import { requireRole, requireGlobalScope, requireAdmin, requireCondoAccess } from "../../shared/middlewares";
import {
  getAllMetricsHandler,
  getCondominiumMetricsHandler,
  getUnifiedDashboardHandler,
  getActionableDashboardHandler,
} from "./dashboard.controller";

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/metrics/all",
    {
      onRequest: [fastify.authenticate, requireRole(["PROFESSIONAL_SYNDIC"]), requireGlobalScope()],
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
      onRequest: [fastify.authenticate, requireRole(["PROFESSIONAL_SYNDIC"]), requireGlobalScope()],
    },
    getUnifiedDashboardHandler
  );

  fastify.get(
    "/actionable/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireAdmin(), requireCondoAccess()],
    },
    getActionableDashboardHandler
  );
};
