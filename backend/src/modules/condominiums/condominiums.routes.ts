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
  updateCondominiumSettingsHandler,
} from "./condominiums.controller";
import { requireRole } from "../../shared/middlewares";

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

  fastify.patch(
    "/:id/settings",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
        requireRole(["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"]),
      ],
    },
    updateCondominiumSettingsHandler
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
