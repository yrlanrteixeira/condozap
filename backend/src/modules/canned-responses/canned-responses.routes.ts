import type { FastifyPluginAsync } from "fastify";
import { requireRole } from "../../shared/middlewares";
import {
  listCannedResponsesHandler,
  createCannedResponseHandler,
  updateCannedResponseHandler,
  deleteCannedResponseHandler,
} from "./canned-responses.controller";

const writeGuard = requireRole([
  "SYNDIC",
  "PROFESSIONAL_SYNDIC",
  "ADMIN",
]);

export const cannedResponsesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    { onRequest: [fastify.authenticate] },
    listCannedResponsesHandler
  );

  fastify.post(
    "/",
    { onRequest: [fastify.authenticate, writeGuard] },
    createCannedResponseHandler
  );

  fastify.patch(
    "/:id",
    { onRequest: [fastify.authenticate, writeGuard] },
    updateCannedResponseHandler
  );

  fastify.delete(
    "/:id",
    { onRequest: [fastify.authenticate, writeGuard] },
    deleteCannedResponseHandler
  );
};
