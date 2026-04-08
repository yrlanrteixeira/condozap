import { FastifyPluginAsync } from "fastify";
import {
  requireRole,
  requireSuperAdminOrGlobalProfessionalSyndic,
  requireCondoAccessUnlessSuperAdmin,
} from "../../shared/middlewares";
import {
  approveUserHandler,
  listCondominiumsHandler,
  listPendingUsersByCondoHandler,
  listPendingUsersForMyCondominiumsHandler,
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

  // Pending users requesting any of the caller's managed condominiums.
  // Used by SYNDIC / PROFESSIONAL_SYNDIC / ADMIN to see all approvals at once.
  fastify.get(
    "/users/pending/my-condominiums",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"]),
      ],
    },
    listPendingUsersForMyCondominiumsHandler
  );

  fastify.get(
    "/users/pending/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"]),
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
        requireRole(["PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"]),
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
        requireRole(["PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"]),
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
