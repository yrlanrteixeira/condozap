import { FastifyPluginAsync } from "fastify";
import { requireCondoAccess } from "../../auth/authorize";
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
};
