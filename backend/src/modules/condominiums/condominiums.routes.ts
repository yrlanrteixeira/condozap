import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin, requireSyndicStrict } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  listCondominiumsHandler,
  getCondominiumHandler,
  createCondominiumHandler,
  updateCondominiumHandler,
  deleteCondominiumHandler,
  getCondominiumStatsHandler,
  updateCondominiumSettingsHandler,
} from "./condominiums.controller";
import { getAnnouncementsByCondominiumHandler } from "../announcements";

export const condominiumsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    listCondominiumsHandler
  );

  fastify.get(
    "/:id/announcements",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    getAnnouncementsByCondominiumHandler
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
        requireSyndicStrict(),
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
