import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma";
import { requireSuperAdmin } from "../../middlewares";
import * as residentService from "./residents.service";
import {
  createResidentSchema,
  updateResidentSchema,
} from "./residents.schemas";
import type {
  CreateResidentRequest,
  ResidentFilters,
  UpdateResidentRequest,
} from "./residents.types";

export const residentsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request) => {
      const filters = request.query as ResidentFilters;
      return residentService.getAllResidents(prisma, filters);
    }
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const filters = request.query as Omit<ResidentFilters, "condominiumId">;

      return residentService.getResidentsByCondominium(
        prisma,
        condominiumId,
        filters
      );
    }
  );

  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = createResidentSchema.parse(
        request.body
      ) as CreateResidentRequest;

      const resident = await residentService.createResident(
        prisma,
        fastify.log,
        body
      );
      return reply.status(201).send(resident);
    }
  );

  fastify.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateResidentSchema.parse(
        request.body
      ) as UpdateResidentRequest;

      const resident = await residentService.updateResident(
        prisma,
        fastify.log,
        id,
        body
      );
      return reply.send(resident);
    }
  );

  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await residentService.deleteResident(prisma, fastify.log, id);
      return reply.status(204).send();
    }
  );
};
