import { FastifyPluginAsync } from "fastify";
import { requireCondoAccess, requireCondoPermission, requireRole } from "../../auth/authorize";
import {
  getStructureHandler,
  updateStructureHandler,
} from "./structure.controller";
import {
  createSectorHandler,
  deleteSectorHandler,
  listSectorsHandler,
  setSectorMembersHandler,
  updateSectorHandler,
  listSectorCategoriesHandler,
} from "./sectors.controller";
import {
  getSectorPermissionsHandler,
  updateSectorPermissionsHandler,
  updateMemberPermissionOverridesHandler,
  updateSectorMemberHandler,
  getAvailableMembersHandler,
  addMemberToSectorHandler,
} from "./sector-permissions.controller";

export const structureRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("view:structure"),
      ],
    },
    getStructureHandler
  );

  fastify.patch(
    "/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("manage:structure"),
      ],
    },
    updateStructureHandler
  );

  fastify.get(
    "/:condominiumId/sectors",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("view:structure"),
      ],
    },
    listSectorsHandler
  );

  fastify.get(
    "/:condominiumId/sectors/categories",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    listSectorCategoriesHandler
  );

  // Público - sem auth, para morador criar ocorrência
  fastify.get(
    "/:condominiumId/public/categories",
    {},
    listSectorCategoriesHandler
  );

  fastify.post(
    "/:condominiumId/sectors",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({
          superAdminForbiddenMessage:
            "O usuário Super Admin não pode criar um setor para um condomínio",
        }),
        requireCondoPermission("manage:structure"),
      ],
    },
    createSectorHandler
  );

  fastify.patch(
    "/:condominiumId/sectors/:sectorId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("manage:structure"),
      ],
    },
    updateSectorHandler
  );

  fastify.post(
    "/:condominiumId/sectors/:sectorId/members",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("manage:structure"),
      ],
    },
    setSectorMembersHandler
  );

  fastify.delete(
    "/:condominiumId/sectors/:sectorId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("manage:structure"),
      ],
    },
    deleteSectorHandler
  );

  fastify.get(
    "/:condominiumId/sectors/:sectorId/permissions",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("view:structure"),
      ],
    },
    getSectorPermissionsHandler
  );

  fastify.put(
    "/:condominiumId/sectors/:sectorId/permissions",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
        requireCondoAccess(),
        requireCondoPermission("manage:structure"),
      ],
    },
    updateSectorPermissionsHandler
  );

  fastify.put(
    "/:condominiumId/sectors/:sectorId/members/:memberId/permissions",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
        requireCondoAccess(),
        requireCondoPermission("manage:structure"),
      ],
    },
    updateMemberPermissionOverridesHandler
  );

  fastify.patch(
    "/:condominiumId/sectors/:sectorId/members/:memberId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("manage:structure"),
      ],
    },
    updateSectorMemberHandler
  );

  fastify.get(
    "/:condominiumId/sectors/:sectorId/available-members",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("view:structure"),
      ],
    },
    getAvailableMembersHandler
  );

  fastify.post(
    "/:condominiumId/sectors/:sectorId/add-member",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("manage:structure"),
      ],
    },
    addMemberToSectorHandler
  );
};
