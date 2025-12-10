import { FastifyPluginAsync } from "fastify";
import { requireCondoAccess } from "../../shared/middlewares";
import {
  getStructureHandler,
  updateStructureHandler,
} from "./structure.controller";

export const structureRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "condominiumId" }),
      ],
    },
    getStructureHandler
  );

  fastify.patch(
    "/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "condominiumId" }),
      ],
    },
    updateStructureHandler
  );
};
