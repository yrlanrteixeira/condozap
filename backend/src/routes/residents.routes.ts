import { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireSuperAdmin } from "../middlewares/index.js";
import * as residentService from "../services/residents.service.js";
import { validateCreateResident, validateUpdateResident } from "../schemas/residents.js";
import type {
  CreateResidentRequest,
  UpdateResidentRequest,
  ResidentFilters,
} from "../types/requests.js";

export const residentsRoutes: FastifyPluginAsync = async (fastify) => {
  // =====================================================
  // GET /residents/all
  // Get all residents (SUPER_ADMIN only)
  // =====================================================
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const filters = request.query as ResidentFilters;

      const residents = await residentService.getAllResidents(prisma, filters);

      return reply.send(residents);
    }
  );

  // =====================================================
  // GET /residents/:condominiumId
  // Get residents by condominium
  // =====================================================
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const filters = request.query as Omit<ResidentFilters, "condominiumId">;

      const residents = await residentService.getResidentsByCondominium(
        prisma,
        condominiumId,
        filters
      );

      return reply.send(residents);
    }
  );

  // =====================================================
  // POST /residents
  // Create resident
  // =====================================================
  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = request.body as CreateResidentRequest;

      // Validate
      const validationError = validateCreateResident(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      try {
        const resident = await residentService.createResident(
          prisma,
          fastify.log,
          body
        );
        return reply.status(201).send(resident);
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // PATCH /residents/:id
  // Update resident
  // =====================================================
  fastify.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateResidentRequest;

      // Validate
      const validationError = validateUpdateResident(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      try {
        const resident = await residentService.updateResident(
          prisma,
          fastify.log,
          id,
          body
        );
        return reply.send(resident);
      } catch (error: any) {
        const status = error.message.includes("não encontrado") ? 404 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // DELETE /residents/:id
  // Delete resident
  // =====================================================
  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        await residentService.deleteResident(prisma, fastify.log, id);
        return reply.status(204).send();
      } catch (error: any) {
        const status = error.message.includes("não encontrado") ? 404 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );
};
