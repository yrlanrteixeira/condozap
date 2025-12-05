/**
 * Condominiums Service
 *
 * Business logic for condominiums
 */

import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import * as condominiumDb from "../db/condominiums.js";
import type {
  CreateCondominiumRequest,
  UpdateCondominiumRequest,
} from "../types/requests.js";

export async function createCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateCondominiumRequest,
  userId: string
) {
  // Check if CNPJ already exists
  const existingCondominium = await condominiumDb.findCondominiumByCnpj(
    prisma,
    data.cnpj
  );
  if (existingCondominium) {
    throw new Error("CNPJ já cadastrado");
  }

  const condominium = await condominiumDb.createCondominium(prisma, data);

  logger.info(`Condominium ${condominium.id} created by ${userId}`);

  return condominium;
}

export async function updateCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  data: UpdateCondominiumRequest,
  userId: string
) {
  // Check if condominium exists
  const existing = await condominiumDb.findCondominiumById(prisma, id);
  if (!existing) {
    throw new Error("Condomínio não encontrado");
  }

  // If updating CNPJ, check if it's already in use
  if (data.cnpj && data.cnpj !== existing.cnpj) {
    const cnpjInUse = await condominiumDb.findCondominiumByCnpj(prisma, data.cnpj);
    if (cnpjInUse) {
      throw new Error("CNPJ já cadastrado");
    }
  }

  const condominium = await condominiumDb.updateCondominium(prisma, id, data);

  logger.info(`Condominium ${id} updated by ${userId}`);

  return condominium;
}

export async function deleteCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  userId: string
) {
  // Check if condominium exists
  const existing = await condominiumDb.findCondominiumWithCounts(prisma, id);
  if (!existing) {
    throw new Error("Condomínio não encontrado");
  }

  // Check if has residents or users
  if (existing._count.residents > 0 || existing._count.users > 0) {
    throw new Error(
      `Este condomínio possui ${existing._count.residents} moradores e ${existing._count.users} usuários vinculados. Remova-os primeiro.`
    );
  }

  await condominiumDb.deleteCondominium(prisma, id);

  logger.info(`Condominium ${id} deleted by ${userId}`);
}

export async function getCondominiumById(prisma: PrismaClient, id: string) {
  return condominiumDb.findCondominiumById(prisma, id);
}

export async function getAllCondominiums(prisma: PrismaClient) {
  return condominiumDb.findAllCondominiums(prisma);
}

export async function getCondominiumStats(prisma: PrismaClient, id: string) {
  return condominiumDb.getCondominiumStats(prisma, id);
}
