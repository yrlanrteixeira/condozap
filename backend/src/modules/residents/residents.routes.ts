import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  createResidentHandler,
  deleteResidentHandler,
  listAllResidentsHandler,
  listResidentsByCondoHandler,
  updateResidentHandler,
} from "./residents.controller";

export const residentsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    listAllResidentsHandler
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    listResidentsByCondoHandler
  );

  fastify.post(
    "/",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess("condominiumId", "body"),
      ],
    },
    createResidentHandler
  );

  fastify.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    updateResidentHandler
  );

  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    deleteResidentHandler
  );
};
