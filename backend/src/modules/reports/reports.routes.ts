import type { FastifyPluginAsync } from "fastify";
import { requireAdmin, requireCondoAccess } from "../../shared/middlewares";
import { getReportsHandler } from "./reports.controller";

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireAdmin(), requireCondoAccess()],
    },
    getReportsHandler
  );
};
