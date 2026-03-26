import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../shared/middlewares";
import { getPlatformStatsHandler } from "./platform.controller";

export const platformRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/stats",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    getPlatformStatsHandler
  );
};
