import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  createCondominiumSchema,
  updateCondominiumSchema,
  updateCondominiumSettingsSchema,
  type CreateCondominiumRequest,
  type UpdateCondominiumRequest,
  type UpdateCondominiumSettingsRequest,
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

export async function updateCondominiumSettingsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const body = updateCondominiumSettingsSchema.parse(
    request.body
  ) as UpdateCondominiumSettingsRequest;
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

export async function getOnboardingHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const condominiumId = (request.params as any).id;

  const [condominium, sectorCount, residentCount, messageCount, handledComplaintCount] = await Promise.all([
    prisma.condominium.findUnique({ where: { id: condominiumId }, select: { structure: true } }),
    prisma.sector.count({ where: { condominiumId } }),
    prisma.resident.count({ where: { condominiumId } }),
    prisma.message.count({ where: { condominiumId } }),
    prisma.complaint.count({ where: { condominiumId, status: { notIn: ["NEW", "TRIAGE"] } } }),
  ]);

  const steps = {
    structureConfigured: condominium?.structure != null && JSON.stringify(condominium.structure) !== "null",
    sectorCreated: sectorCount > 0,
    residentCreated: residentCount > 0,
    messageSent: messageCount > 0,
    complaintHandled: handledComplaintCount > 0,
  };

  return reply.send({
    completed: Object.values(steps).every(Boolean),
    steps,
  });
}
