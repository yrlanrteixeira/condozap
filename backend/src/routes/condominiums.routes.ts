import { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireSuperAdmin, requireCondoAccess } from "../middlewares/index.js";
import { AuthUser } from "../types/auth.js";
import * as condominiumService from "../services/condominiums.service.js";
import {
  validateCreateCondominium,
  validateUpdateCondominium,
} from "../schemas/condominiums.js";
import type {
  CreateCondominiumRequest,
  UpdateCondominiumRequest,
} from "../types/requests.js";

export const condominiumsRoutes: FastifyPluginAsync = async (fastify) => {
  // =====================================================
  // GET /condominiums
  // List all condominiums (SUPER_ADMIN only)
  // =====================================================
  fastify.get(
    "/",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (_request, reply) => {
      const condominiums = await condominiumService.getAllCondominiums(prisma);
      return reply.send(condominiums);
    }
  );

  // =====================================================
  // GET /condominiums/:id
  // Get single condominium details
  // =====================================================
  fastify.get(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireCondoAccess({ paramName: "id" })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const condominium = await condominiumService.getCondominiumById(prisma, id);

      if (!condominium) {
        return reply.status(404).send({ error: "Condomínio não encontrado" });
      }

      return reply.send(condominium);
    }
  );

  // =====================================================
  // POST /condominiums
  // Create new condominium (SUPER_ADMIN only)
  // =====================================================
  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const body = request.body as CreateCondominiumRequest;

      // Validate
      const validationError = validateCreateCondominium(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      try {
        const condominium = await condominiumService.createCondominium(
          prisma,
          fastify.log,
          body,
          user.id
        );
        return reply.status(201).send(condominium);
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // PATCH /condominiums/:id
  // Update condominium (SUPER_ADMIN only)
  // =====================================================
  fastify.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as AuthUser;
      const body = request.body as UpdateCondominiumRequest;

      // Validate
      const validationError = validateUpdateCondominium(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      try {
        const condominium = await condominiumService.updateCondominium(
          prisma,
          fastify.log,
          id,
          body,
          user.id
        );
        return reply.send(condominium);
      } catch (error: any) {
        const status = error.message.includes("não encontrado") ? 404 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // DELETE /condominiums/:id
  // Delete condominium (SUPER_ADMIN only)
  // =====================================================
  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as AuthUser;

      try {
        await condominiumService.deleteCondominium(
          prisma,
          fastify.log,
          id,
          user.id
        );
        return reply.status(204).send();
      } catch (error: any) {
        const status = error.message.includes("não encontrado") ? 404 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // GET /condominiums/:id/stats
  // Get condominium statistics
  // =====================================================
  fastify.get(
    "/:id/stats",
    {
      onRequest: [fastify.authenticate, requireCondoAccess({ paramName: "id" })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const stats = await condominiumService.getCondominiumStats(prisma, id);

      return reply.send(stats);
    }
  );
};
