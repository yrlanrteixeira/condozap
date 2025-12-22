import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  createCondominiumSchema,
  updateCondominiumSchema,
  type CreateCondominiumRequest,
  type UpdateCondominiumRequest,
} from "./condominiums.schema";
import * as condominiumService from "./condominiums.service";
import type { AuthUser } from "../../types/auth";

export async function listCondominiumsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const condominiums = await condominiumService.getAllCondominiums(prisma);
  return reply.send(condominiums);
}

export async function getCondominiumHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const condo = await condominiumService.getCondominiumById(prisma, id);
  if (!condo) {
    return reply.status(404).send({ error: "Condomínio não encontrado" });
  }
  return reply.send(condo);
}

export async function createCondominiumHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = createCondominiumSchema.parse(
    request.body
  ) as CreateCondominiumRequest;
  const user = request.user as AuthUser;

  const condominium = await condominiumService.createCondominium(
    prisma,
    request.log,
    body,
    user.id
  );

  return reply.status(201).send(condominium);
}

export async function updateCondominiumHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const body = updateCondominiumSchema.parse(
    request.body
  ) as UpdateCondominiumRequest;
  const user = request.user as AuthUser;

  const condominium = await condominiumService.updateCondominium(
    prisma,
    request.log,
    id,
    body,
    user.id
  );

  return reply.send(condominium);
}

export async function deleteCondominiumHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const user = request.user as AuthUser;

  await condominiumService.deleteCondominium(prisma, request.log, id, user.id);

  return reply.status(204).send();
}

export async function getCondominiumStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const stats = await condominiumService.getCondominiumStats(prisma, id);
  return reply.send(stats);
}
