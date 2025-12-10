import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import {
  requireSuperAdmin,
  requireCondoAccess,
} from "../../middlewares/index.js";
import { AuthUser } from "../../types/auth.js";
import * as condominiumService from "./condominiums.service.js";
import {
  createCondominiumSchema,
  updateCondominiumSchema,
  type CreateCondominiumSchema,
  type UpdateCondominiumSchema,
} from "./condominiums.schemas.js";

export const condominiumsRoutes: FastifyPluginAsync = async (fastify) => {
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

  fastify.get(
    "/:id",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const condominium = await condominiumService.getCondominiumById(
        prisma,
        id
      );

      if (!condominium) {
        return reply.status(404).send({ error: "Condomínio não encontrado" });
      }

      return reply.send(condominium);
    }
  );

  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const body = createCondominiumSchema.parse(
        request.body
      ) as CreateCondominiumSchema;

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

  fastify.patch(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as AuthUser;
      const body = updateCondominiumSchema.parse(
        request.body
      ) as UpdateCondominiumSchema;

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

  fastify.get(
    "/:id/stats",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "id" }),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const stats = await condominiumService.getCondominiumStats(prisma, id);

      return reply.send(stats);
    }
  );
};
