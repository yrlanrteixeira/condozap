import { FastifyPluginAsync } from "fastify";
import { requireRole, requireGlobalScope } from "../../shared/middlewares";
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
};
