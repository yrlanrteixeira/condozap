import { FastifyPluginAsync } from "fastify";
import { requireRole, requireSuperAdmin, requireAdmin } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  createAdminHandler,
  createSyndicHandler,
  listUsersByCondoHandler,
  updateUserRoleHandler,
  updateCouncilPositionHandler,
  removeUserHandler,
  inviteUserHandler,
} from "./user-management.controller";

export const userManagementRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/users/create-admin",
    {
      onRequest: [
        fastify.authenticate,
        requireAdmin(),
        requireCondoAccess({ source: "body" }),
      ],
    },
    createAdminHandler
  );

  fastify.post(
    "/users/create-syndic",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    createSyndicHandler
  );

  fastify.get(
    "/users/condominium/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    listUsersByCondoHandler
  );

  fastify.patch(
    "/users/update-role",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "SYNDIC"]),
      ],
    },
    updateUserRoleHandler
  );

  fastify.patch(
    "/users/update-council-position",
    {
      onRequest: [
        fastify.authenticate,
        requireAdmin(),
        requireCondoAccess({ source: "body" }),
      ],
    },
    updateCouncilPositionHandler
  );

  fastify.delete(
    "/users/remove",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    removeUserHandler
  );

  fastify.post(
    "/users/invite",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    inviteUserHandler
  );
};


