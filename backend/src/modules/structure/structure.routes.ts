import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma";
import { requireCondoAccess } from "../../middlewares";
import {
  structureParamsSchema,
  updateStructureSchema,
} from "./structure.schemas";
import { getStructure, updateStructure } from "./structure.service";
import type { StructureParams, UpdateStructureBody } from "./structure.types";

export const structureRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "condominiumId" }),
      ],
    },
    async (request, reply) => {
      const { condominiumId } = structureParamsSchema.parse(
        request.params
      ) as StructureParams;

      const result = await getStructure(prisma, condominiumId);
      return reply.send(result);
    }
  );

  fastify.patch(
    "/:condominiumId",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess({ paramName: "condominiumId" }),
      ],
    },
    async (request, reply) => {
      const { condominiumId } = structureParamsSchema.parse(
        request.params
      ) as StructureParams;
      const body = updateStructureSchema.parse(
        request.body
      ) as UpdateStructureBody;

      try {
        const result = await updateStructure(prisma, condominiumId, body);
        fastify.log.info(`Structure updated for condominium ${condominiumId}`);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({ error: "Erro ao atualizar estrutura do condomínio" });
      }
    }
  );
};
