import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin, requireAdmin, requireSyndicStrict, requireRole } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  createAdminHandler,
  createSyndicHandler,
  createProfessionalSyndicHandler,
  listUsersByCondoHandler,
  updateUserRoleHandler,
  updateCouncilPositionHandler,
  removeUserHandler,
  inviteUserHandler,
  listSyndicsHandler,
} from "./user-management.controller";
import { updateAccountExpirationHandler } from "./expiration.controller";
import { updateAssignedTowerHandler } from "./assigned-tower.controller";
import { createSectorMemberHandler } from "./sector-member.controller";

export const userManagementRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/users/create-admin",
    {
      onRequest: [
        fastify.authenticate,
        requireSyndicStrict(),
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

  fastify.post(
    "/users/create-professional-syndic",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    createProfessionalSyndicHandler
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
        requireSyndicStrict(),
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
      onRequest: [fastify.authenticate, requireSyndicStrict()],
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

  fastify.get(
    "/users/syndics",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    listSyndicsHandler
  );

  fastify.patch(
    "/users/:userId/expiration",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
        requireCondoAccess({ source: "body" }),
      ],
    },
    updateAccountExpirationHandler
  );

  fastify.patch("/:userId/assigned-tower", {
    onRequest: [
      fastify.authenticate,
      requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
      requireCondoAccess({ source: "body" }),
    ],
  }, updateAssignedTowerHandler);

  fastify.post("/users/create-sector-member", {
    onRequest: [fastify.authenticate, requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])],
  }, createSectorMemberHandler);
};


