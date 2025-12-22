import { FastifyPluginAsync } from "fastify";
import {
  requireSuperAdmin,
  requireCondoAccess,
} from "../../shared/middlewares";
import {
  listCondominiumsHandler,
  getCondominiumHandler,
  createCondominiumHandler,
  updateCondominiumHandler,
  deleteCondominiumHandler,
  getCondominiumStatsHandler,
} from "./condominiums.controller";

export const condominiumsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    listCondominiumsHandler
  );

  fastify.get(
    "/:id",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    getCondominiumHandler
  );

  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    createCondominiumHandler
  );

  fastify.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    updateCondominiumHandler
  );

  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    deleteCondominiumHandler
  );

  fastify.get(
    "/:id/stats",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    getCondominiumStatsHandler
  );
};
