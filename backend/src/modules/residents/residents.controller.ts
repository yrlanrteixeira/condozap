import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  condominiumIdParamSchema,
  createResidentSchema,
  residentFiltersSchema,
  residentIdParamSchema,
  updateResidentSchema,
  type CreateResidentRequest,
  type ResidentFilters,
  type UpdateResidentRequest,
} from "./residents.schema";
import {
  createResident,
  deleteResident,
  getAllResidents,
  getResidentsByCondominium,
  updateResident,
} from "./residents.service";

export async function listAllResidentsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const filters = request.query as ResidentFilters;
  const residents = await getAllResidents(prisma, filters);
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

  const residents = await getResidentsByCondominium(
    prisma,
    condominiumId,
    filters
  );
  return reply.send(residents);
}

export async function createResidentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = createResidentSchema.parse(
    request.body
  ) as CreateResidentRequest;

  const resident = await createResident(prisma, request.log, body);
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

  const resident = await updateResident(prisma, request.log, id, body);
  return reply.send(resident);
}

export async function deleteResidentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = residentIdParamSchema.parse(request.params);

  await deleteResident(prisma, request.log, id);
  return reply.status(204).send();
}

