import { FastifyInstance } from "fastify";
import { getSectorDashboardStatsHandler } from "./sector-dashboard.controller";
import { requireRole } from "../../shared/middlewares";

export async function sectorDashboardRoutes(fastify: FastifyInstance) {
  fastify.get("/stats", {
    onRequest: [fastify.authenticate, requireRole(["SETOR_MEMBER", "SETOR_MANAGER"])],
  }, getSectorDashboardStatsHandler);
}
