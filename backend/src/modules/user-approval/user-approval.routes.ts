import { FastifyPluginAsync } from "fastify";
import { requireAdmin, requireRole } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  approveUserHandler,
  listCondominiumsHandler,
  listPendingUsersByCondoHandler,
  listPendingUsersHandler,
  myStatusHandler,
  rejectUserHandler,
} from "./user-approval.controller";

/** SUPER_ADMIN e PROFESSIONAL_SYNDIC podem listar todos os condomínios e pendentes */
const requireSuperOrProfessionalSyndic = () =>
  requireRole(["SUPER_ADMIN", "PROFESSIONAL_SYNDIC"]);

export const userApprovalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/condominiums/list",
    {
      onRequest: [fastify.authenticate, requireSuperOrProfessionalSyndic()],
    },
    listCondominiumsHandler
  );

  fastify.get(
    "/users/pending/all",
    {
      onRequest: [fastify.authenticate, requireSuperOrProfessionalSyndic()],
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
