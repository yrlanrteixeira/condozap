import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { ConflictError, NotFoundError } from "../../lib/errors";
import * as residentDb from "./residents.db";
import type {
  CreateResidentRequest,
  ResidentFilters,
  UpdateResidentRequest,
} from "./residents.types";

export async function createResident(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateResidentRequest
) {
  const emailExists = await residentDb.checkEmailExists(
    prisma,
    data.email,
    data.condominiumId
  );
  if (emailExists) {
    throw new ConflictError("Email já cadastrado neste condomínio");
  }

  const unitOccupied = await residentDb.checkUnitOccupied(
    prisma,
    data.condominiumId,
    data.tower,
    data.floor,
    data.unit
  );
  if (unitOccupied) {
    throw new ConflictError("Esta unidade já está ocupada");
  }

  const resident = await residentDb.createResident(prisma, data);

  logger.info(`Resident ${resident.id} created`);

  return resident;
}

export async function updateResident(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  data: UpdateResidentRequest
) {
  const existing = await residentDb.findResidentById(prisma, id);
  if (!existing) {
    throw new NotFoundError("Morador");
  }

  if (data.email) {
    const emailExists = await residentDb.checkEmailExists(
      prisma,
      data.email,
      existing.condominiumId,
      id
    );
    if (emailExists) {
      throw new ConflictError("Email já cadastrado neste condomínio");
    }
  }

  if (data.tower || data.floor || data.unit) {
    const unitOccupied = await residentDb.checkUnitOccupied(
      prisma,
      existing.condominiumId,
      data.tower || existing.tower,
      data.floor || existing.floor,
      data.unit || existing.unit,
      id
    );
    if (unitOccupied) {
      throw new ConflictError("Esta unidade já está ocupada");
    }
  }

  const resident = await residentDb.updateResident(prisma, id, data);

  logger.info(`Resident ${id} updated`);

  return resident;
}

export async function deleteResident(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string
) {
  const existing = await residentDb.findResidentById(prisma, id);
  if (!existing) {
    throw new NotFoundError("Morador");
  }

  const complaintsCount = await residentDb.countResidentComplaints(prisma, id);
  if (complaintsCount > 0) {
    throw new ConflictError(
      `Não é possível excluir morador com ${complaintsCount} denúncias`
    );
  }

  await residentDb.deleteResident(prisma, id);

  logger.info(`Resident ${id} deleted`);
}

export async function getResidentById(prisma: PrismaClient, id: string) {
  return residentDb.findResidentById(prisma, id);
}

export async function getAllResidents(
  prisma: PrismaClient,
  filters: ResidentFilters
) {
  return residentDb.findAllResidents(prisma, filters);
}

export async function getResidentsByCondominium(
  prisma: PrismaClient,
  condominiumId: string,
  filters: Omit<ResidentFilters, "condominiumId">
) {
  return residentDb.findResidentsByCondominium(prisma, condominiumId, filters);
}
