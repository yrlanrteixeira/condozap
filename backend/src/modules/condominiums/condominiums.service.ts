import { PrismaClient, Prisma } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { ConflictError, NotFoundError } from "../../shared/errors";
import type {
  CreateCondominiumRequest,
  UpdateCondominiumRequest,
} from "./condominiums.schema";
import * as repo from "./condominiums.repository";

export async function createCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateCondominiumRequest,
  userId: string
) {
  const existingCondominium = await repo.findByCnpj(prisma, data.cnpj);
  if (existingCondominium) {
    throw new ConflictError("CNPJ já cadastrado");
  }

  const condominium = await repo.create(prisma, {
    name: data.name,
    cnpj: data.cnpj,
    whatsappPhone: data.whatsappPhone,
    whatsappBusinessId: data.whatsappBusinessId,
  });

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
  const existing = await repo.findById(prisma, id);
  if (!existing) {
    throw new NotFoundError("Condomínio não encontrado");
  }

  if (data.cnpj && data.cnpj !== existing.cnpj) {
    const cnpjInUse = await repo.findByCnpj(prisma, data.cnpj);
    if (cnpjInUse) {
      throw new ConflictError("CNPJ já cadastrado");
    }
  }

  const updateData: Prisma.CondominiumUpdateInput = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.cnpj !== undefined && { cnpj: data.cnpj }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.whatsappPhone !== undefined && { whatsappPhone: data.whatsappPhone }),
    ...(data.whatsappBusinessId !== undefined && {
      whatsappBusinessId: data.whatsappBusinessId,
    }),
    ...(data.structure !== undefined && {
      structure: data.structure as Prisma.InputJsonValue,
    }),
  };

  const condominium = await repo.update(prisma, id, updateData);

  logger.info(`Condominium ${id} updated by ${userId}`);

  return condominium;
}

export async function deleteCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  userId: string
) {
  const existing = await repo.findByIdWithRelationCounts(prisma, id);
  if (!existing) {
    throw new NotFoundError("Condomínio não encontrado");
  }

  if (existing._count.residents > 0 || existing._count.users > 0) {
    throw new ConflictError(
      `Este condomínio possui ${existing._count.residents} moradores e ${existing._count.users} usuários vinculados. Remova-os primeiro.`
    );
  }

  await repo.deleteById(prisma, id);

  logger.info(`Condominium ${id} deleted by ${userId}`);
}

export async function getCondominiumById(prisma: PrismaClient, id: string) {
  return repo.findByIdWithCounts(prisma, id);
}

export async function getAllCondominiums(prisma: PrismaClient) {
  return repo.findAll(prisma);
}

export async function getCondominiumStats(prisma: PrismaClient, id: string) {
  return repo.getStats(prisma, id);
}
