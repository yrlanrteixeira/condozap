import { FastifyPluginAsync } from "fastify";
import { requireAdmin, requireRole, requireGlobalScope } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  approveUserHandler,
  listCondominiumsHandler,
  listPendingUsersByCondoHandler,
  listPendingUsersHandler,
  myStatusHandler,
  rejectUserHandler,
} from "./user-approval.controller";

export const userApprovalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/condominiums/list",
    {
      onRequest: [fastify.authenticate, requireRole(["PROFESSIONAL_SYNDIC"]), requireGlobalScope()],
    },
    listCondominiumsHandler
  );

  fastify.get(
    "/users/pending/all",
    {
      onRequest: [fastify.authenticate, requireRole(["PROFESSIONAL_SYNDIC"]), requireGlobalScope()],
    },
    listPendingUsersHandler
  );

  fastify.get(
    "/users/pending/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "condominiumId" }),
      ],
    },
    listPendingUsersByCondoHandler
  );

  fastify.post(
    "/users/approve",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
      preHandler: [requireCondoAccess({ source: "body" })],
    },
    approveUserHandler
  );

  fastify.post(
    "/users/reject",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    rejectUserHandler
  );

  fastify.get(
    "/users/my-status",
    {
      onRequest: [fastify.authenticate],
    },
    myStatusHandler
  );
};
