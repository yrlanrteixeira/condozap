import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  structureParamsSchema,
  updateStructureSchema,
  type StructureParams,
  type UpdateStructureBody,
} from "./structure.schema";
import { getStructure, updateStructure } from "./structure.service";

export async function getStructureHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = structureParamsSchema.parse(
    request.params
  ) as StructureParams;

  const result = await getStructure(prisma, condominiumId);
  return reply.send(result);
}

export async function updateStructureHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = structureParamsSchema.parse(
    request.params
  ) as StructureParams;
  const body = updateStructureSchema.parse(
    request.body
  ) as UpdateStructureBody;

  const result = await updateStructure(prisma, condominiumId, body);
  request.log.info(`Structure updated for condominium ${condominiumId}`);
  return reply.send(result);
}

