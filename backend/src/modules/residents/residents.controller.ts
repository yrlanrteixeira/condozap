import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { ActivityType } from "@prisma/client";
import {
  condominiumIdParamSchema,
  createResidentSchema,
  importResidentsSchema,
  provisionResidentSchema,
  residentFiltersSchema,
  residentIdParamSchema,
  updateConsentSchema,
  updateResidentSchema,
  type CreateResidentRequest,
  type ProvisionResidentBody,
  type ResidentFilters,
  type UpdateResidentRequest,
} from "./residents.schema";
import {
  createResident,
  deleteResident,
  getResidentsByCondominium,
  importResidents,
  updateResident,
  updateResidentConsent,
} from "./residents.service";
import { provisionResident } from "./residents-provision.service";
import {
  findResidentByIdForUser,
  findResidentsForUser,
  getAccessContext,
} from "./residents.repository";
import { createActivityLog } from "../history/activity-log.service";
import { AuthUser } from "../../types/auth";
import { isCondominiumAllowed } from "../../auth/context";

export async function listAllResidentsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const filters = request.query as ResidentFilters;
  const user = request.user as AuthUser;
  const residents = await findResidentsForUser(prisma, user, filters);
  return reply.send(residents);
}

export async function listResidentsByCondoHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = condominiumIdParamSchema.parse(request.params);
  const filters = residentFiltersSchema
    .omit({ condominiumId: true })
    .parse(request.query) as Omit<ResidentFilters, "condominiumId">;

  const user = request.user as AuthUser;
  const context = await getAccessContext(prisma, user);
  if (!isCondominiumAllowed(context, condominiumId)) {
    return reply.status(403).send({ error: "Acesso negado ao condomínio" });
  }

  const residents = await getResidentsByCondominium(
    prisma,
    condominiumId,
    filters
  );
  return reply.send(residents);
}

export async function provisionResidentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = provisionResidentSchema.parse(
    request.body
  ) as ProvisionResidentBody;
  const user = request.user as AuthUser;
  const context = await getAccessContext(prisma, user);
  if (!isCondominiumAllowed(context, body.condominiumId)) {
    return reply.status(403).send({ error: "Acesso negado ao condomínio" });
  }

  const result = await provisionResident(prisma, body, user.id);
  return reply.status(201).send(result);
}

export async function createResidentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = createResidentSchema.parse(
    request.body
  ) as CreateResidentRequest;
  const user = request.user as AuthUser;
  const context = await getAccessContext(prisma, user);
  if (!isCondominiumAllowed(context, body.condominiumId)) {
    return reply.status(403).send({ error: "Acesso negado ao condomínio" });
  }

  const resident = await createResident(prisma, request.log, body);

  await createActivityLog(prisma, {
    condominiumId: body.condominiumId,
    userId: user.id,
    userName: user.name,
    type: ActivityType.RESIDENT_CREATED,
    description: `Morador ${resident.name} criado (Unidade ${resident.unit}, Torre ${resident.tower})`,
    metadata: {
      residentId: resident.id,
      unit: resident.unit,
      tower: resident.tower,
    },
    targetId: resident.id,
    targetType: "Resident",
  });

  return reply.status(201).send(resident);
}

export async function updateResidentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = residentIdParamSchema.parse(request.params);
  const body = updateResidentSchema.parse(
    request.body
  ) as UpdateResidentRequest;
  const user = request.user as AuthUser;
  const resident = await findResidentByIdForUser(prisma, user, id);
  if (!resident) {
    return reply
      .status(403)
      .send({ error: "Acesso negado ou morador não encontrado" });
  }

  const updated = await updateResident(prisma, request.log, id, body);
  return reply.send(updated);
}

export async function getResidentDetailHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = residentIdParamSchema.parse(request.params);
  const user = request.user as AuthUser;
  const resident = await findResidentByIdForUser(prisma, user, id);
  if (!resident) {
    return reply
      .status(404)
      .send({ error: "Morador não encontrado" });
  }
  return reply.send(resident);
}

export async function updateResidentConsentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = residentIdParamSchema.parse(request.params);
  const body = updateConsentSchema.parse(request.body);
  const user = request.user as AuthUser;

  // Cross-condo isolation: 404 if resident not visible to caller's scope.
  const resident = await findResidentByIdForUser(prisma, user, id);
  if (!resident) {
    return reply
      .status(404)
      .send({ error: "Morador não encontrado" });
  }

  // LGPD: a RESIDENT may only modify their own consent.
  if (user.role === "RESIDENT" && resident.userId !== user.id) {
    return reply
      .status(403)
      .send({ error: "Você só pode alterar seu próprio consentimento" });
  }

  const updated = await updateResidentConsent(prisma, request.log, id, body);
  return reply.send(updated);
}

export async function importResidentsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = importResidentsSchema.parse(request.body);

  const results = await importResidents(prisma, request.log, body.condominiumId, body.residents);
  return reply.status(201).send(results);
}

export async function deleteResidentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = residentIdParamSchema.parse(request.params);
  const user = request.user as AuthUser;
  const resident = await findResidentByIdForUser(prisma, user, id);
  if (!resident) {
    return reply
      .status(403)
      .send({ error: "Acesso negado ou morador não encontrado" });
  }

  await deleteResident(prisma, request.log, id);
  return reply.status(204).send();
}
