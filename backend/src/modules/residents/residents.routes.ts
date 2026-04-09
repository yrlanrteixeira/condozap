import { FastifyPluginAsync } from "fastify";
import { requireRole, requireGlobalScope } from "../../shared/middlewares";
import { requireCondoAccess, requireCondoPermission } from "../../auth/authorize";
import {
  createResidentHandler,
  deleteResidentHandler,
  getResidentDetailHandler,
  importResidentsHandler,
  listAllResidentsHandler,
  listResidentsByCondoHandler,
  provisionResidentHandler,
  updateResidentConsentHandler,
  updateResidentHandler,
} from "./residents.controller";

export const residentsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireRole(["PROFESSIONAL_SYNDIC"]), requireGlobalScope()],
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
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermission("view:residents"),
      ],
    },
    listResidentsByCondoHandler
  );

  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        requireCondoAccess({ source: "body" }),
        requireCondoPermission("create:resident", { source: "body" }),
      ],
    },
    createResidentHandler
  );

  fastify.post(
    "/import",
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        requireCondoAccess({ source: "body" }),
        requireCondoPermission("manage:residents", { source: "body" }),
      ],
    },
    importResidentsHandler
  );

  fastify.post(
    "/provision",
    {
      onRequest: [
        fastify.authenticate,
        requireRole([
          "SUPER_ADMIN",
          "PROFESSIONAL_SYNDIC",
          "SYNDIC",
          "ADMIN",
        ]),
      ],
      preHandler: [requireCondoAccess({ source: "body" })],
    },
    provisionResidentHandler
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
