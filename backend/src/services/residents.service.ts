/**
 * Residents Service
 *
 * Business logic for residents
 */

import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import * as residentDb from "../db/residents.js";
import type { CreateResidentRequest, UpdateResidentRequest } from "../types/requests.js";

export async function createResident(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateResidentRequest
) {
  // Check if email already exists
  const emailExists = await residentDb.checkEmailExists(
    prisma,
    data.email,
    data.condominiumId
  );
  if (emailExists) {
    throw new Error("Email já cadastrado neste condomínio");
  }

  // Check if unit is occupied
  const unitOccupied = await residentDb.checkUnitOccupied(
    prisma,
    data.condominiumId,
    data.tower,
    data.floor,
    data.unit
  );
  if (unitOccupied) {
    throw new Error("Esta unidade já está ocupada");
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
  // Check if resident exists
  const existing = await residentDb.findResidentById(prisma, id);
  if (!existing) {
    throw new Error("Morador não encontrado");
  }

  // Check email if being updated
  if (data.email) {
    const emailExists = await residentDb.checkEmailExists(
      prisma,
      data.email,
      existing.condominiumId,
      id
    );
    if (emailExists) {
      throw new Error("Email já cadastrado neste condomínio");
    }
  }

  // Check unit if being changed
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
      throw new Error("Esta unidade já está ocupada");
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
  // Check if resident exists
  const existing = await residentDb.findResidentById(prisma, id);
  if (!existing) {
    throw new Error("Morador não encontrado");
  }

  // Check if has complaints
  const complaintsCount = await residentDb.countResidentComplaints(prisma, id);
  if (complaintsCount > 0) {
    throw new Error(`Não é possível excluir morador com ${complaintsCount} denúncias`);
  }

  await residentDb.deleteResident(prisma, id);

  logger.info(`Resident ${id} deleted`);
}

export async function getResidentById(prisma: PrismaClient, id: string) {
  return residentDb.findResidentById(prisma, id);
}

export async function getAllResidents(
  prisma: PrismaClient,
  filters: {
    condominiumId?: string;
    tower?: string;
    floor?: string;
    type?: string;
    search?: string;
  }
) {
  return residentDb.findAllResidents(prisma, filters);
}

export async function getResidentsByCondominium(
  prisma: PrismaClient,
  condominiumId: string,
  filters: {
    tower?: string;
    floor?: string;
    type?: string;
    search?: string;
  }
) {
  return residentDb.findResidentsByCondominium(prisma, condominiumId, filters);
}
