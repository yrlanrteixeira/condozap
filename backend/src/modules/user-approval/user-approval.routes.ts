import { FastifyPluginAsync } from "fastify";
import {
  requireRole,
  requireSuperAdminOrGlobalProfessionalSyndic,
  requireCondoAccess,
  requireCondoAccessUnlessSuperAdmin,
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
      onRequest: [
        fastify.authenticate,
        requireSuperAdminOrGlobalProfessionalSyndic(),
      ],
    },
    listCondominiumsHandler
  );

  fastify.get(
    "/users/pending/all",
    {
      onRequest: [
        fastify.authenticate,
        requireSuperAdminOrGlobalProfessionalSyndic(),
      ],
    },
    listPendingUsersHandler
  );

  fastify.get(
    "/users/pending/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC", "SUPER_ADMIN"]),
      ],
      preHandler: [
        requireCondoAccessUnlessSuperAdmin({ paramName: "condominiumId" }),
      ],
    },
    listPendingUsersByCondoHandler
  );

  fastify.post(
    "/users/approve",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC", "SUPER_ADMIN"]),
      ],
      preHandler: [requireCondoAccessUnlessSuperAdmin({ source: "body" })],
    },
    approveUserHandler
  );

  fastify.post(
    "/users/reject",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC", "SUPER_ADMIN"]),
      ],
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
