import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin, requireAdmin, requireSyndicStrict, requireRole } from "../../shared/middlewares";
import { requireCondoAccess, requireCondoPermission } from "../../auth/authorize";
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
  updateSyndicHandler,
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
        requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC", "SUPER_ADMIN"]),
      ],
      preHandler: [
        requireCondoAccess({ source: "body" }),
        requireCondoPermission("manage:team", { source: "body" }),
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
      onRequest: [
        fastify.authenticate,
        requireAdmin(),
        requireCondoAccess(),
        requireCondoPermission("manage:team"),
      ],
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
      onRequest: [fastify.authenticate, requireAdmin()],
      preHandler: [requireCondoAccess({ source: "body" })],
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
      // Inviting another management-level user is a síndico-only action
      // (ADMIN/Conselheiro cannot invite peers).
      onRequest: [fastify.authenticate, requireSyndicStrict()],
    },
    inviteUserHandler
  );

  fastify.get(
    "/users/syndics",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    listSyndicsHandler
  );

  fastify.patch(
    "/users/syndics/:userId",
    { onRequest: [fastify.authenticate, requireSuperAdmin()] },
    updateSyndicHandler
  );

  fastify.patch(
    "/users/:userId/expiration",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
      ],
      preHandler: [requireCondoAccess({ source: "body" })],
    },
    updateAccountExpirationHandler
  );

  fastify.patch("/:userId/assigned-tower", {
    onRequest: [
      fastify.authenticate,
      requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
    ],
    preHandler: [requireCondoAccess({ source: "body" })],
  }, updateAssignedTowerHandler);

  fastify.post("/users/create-sector-member", {
    onRequest: [
      fastify.authenticate,
      requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC", "SUPER_ADMIN"]),
    ],
    preHandler: [requireCondoAccess({ source: "body" })],
  }, createSectorMemberHandler);
};


