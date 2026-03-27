import { FastifyPluginAsync } from "fastify";
import {
  listNotificationsHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllAsReadHandler,
} from "./notifications.controller";

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET / — List notifications for current user
  fastify.get(
    "/",
    { onRequest: [fastify.authenticate] },
    listNotificationsHandler
  );

  // GET /unread-count — Lightweight unread count for polling
  fastify.get(
    "/unread-count",
    { onRequest: [fastify.authenticate] },
    getUnreadCountHandler
  );

  // PATCH /read-all — Mark all notifications as read (must be before /:id/read)
  fastify.patch(
    "/read-all",
    { onRequest: [fastify.authenticate] },
    markAllAsReadHandler
  );

  // PATCH /:id/read — Mark single notification as read
  fastify.patch(
    "/:id/read",
    { onRequest: [fastify.authenticate] },
    markAsReadHandler
  );
};
