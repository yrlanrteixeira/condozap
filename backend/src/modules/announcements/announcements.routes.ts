import type { FastifyPluginAsync } from "fastify";
import { requireSyndicStrict, requireCondoAccess } from "../../shared/middlewares";
import {
  listAnnouncementsHandler,
  createAnnouncementHandler,
  deleteAnnouncementHandler,
} from "./announcements.controller";

export const announcementRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:condominiumId",
    { onRequest: [fastify.authenticate, requireCondoAccess()] },
    listAnnouncementsHandler
  );

  fastify.post(
    "/",
    { onRequest: [fastify.authenticate, requireSyndicStrict()] },
    createAnnouncementHandler
  );

  fastify.delete(
    "/:id",
    { onRequest: [fastify.authenticate, requireSyndicStrict()] },
    deleteAnnouncementHandler
  );
};
