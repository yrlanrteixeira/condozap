import { FastifyPluginAsync } from "fastify";
import { requireCondoAccess, requireRole } from "../../auth/authorize";
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
} from "./sectors.controller";
import {
  getSectorPermissionsHandler,
  updateSectorPermissionsHandler,
  updateMemberPermissionOverridesHandler,
} from "./sector-permissions.controller";

export const structureRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    getStructureHandler
  );

  fastify.patch(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    updateStructureHandler
  );

  fastify.get(
    "/:condominiumId/sectors",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    listSectorsHandler
  );

  fastify.post(
    "/:condominiumId/sectors",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    createSectorHandler
  );

  fastify.patch(
    "/:condominiumId/sectors/:sectorId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    updateSectorHandler
  );

  fastify.post(
    "/:condominiumId/sectors/:sectorId/members",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    setSectorMembersHandler
  );

  fastify.delete(
    "/:condominiumId/sectors/:sectorId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    deleteSectorHandler
  );

  fastify.get(
    "/:condominiumId/sectors/:sectorId/permissions",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
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
      ],
    },
    updateMemberPermissionOverridesHandler
  );
};
