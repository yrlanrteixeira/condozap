import { FastifyPluginAsync } from "fastify";
import {
  requireAdmin,
  requireCondoAccess,
  requireSuperAdmin,
} from "../../shared/middlewares";
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
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    listCondominiumsHandler
  );

  fastify.get(
    "/users/pending/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
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
      onRequest: [
        fastify.authenticate,
        requireAdmin(),
        requireCondoAccess({ source: "body" }),
      ],
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
