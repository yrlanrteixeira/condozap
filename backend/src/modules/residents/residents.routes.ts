import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin } from "../../shared/middlewares";
import { requireCondoAccess } from "../../auth/authorize";
import {
  createResidentHandler,
  deleteResidentHandler,
  getResidentDetailHandler,
  importResidentsHandler,
  listAllResidentsHandler,
  listResidentsByCondoHandler,
  updateResidentConsentHandler,
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
    "/detail/:id",
    {
      onRequest: [fastify.authenticate],
    },
    getResidentDetailHandler
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
        requireCondoAccess({ source: "body" }),
      ],
    },
    createResidentHandler
  );

  fastify.post(
    "/import",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ source: "body" }),
      ],
    },
    importResidentsHandler
  );

  fastify.patch(
    "/:id/consent",
    {
      onRequest: [fastify.authenticate],
    },
    updateResidentConsentHandler
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
