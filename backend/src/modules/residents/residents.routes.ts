import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../shared/middlewares";
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
      onRequest: [fastify.authenticate],
    },
    listResidentsByCondoHandler
  );

  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
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
