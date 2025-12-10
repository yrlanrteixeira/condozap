import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { ConflictError, NotFoundError } from "../../shared/errors";
import type {
  CreateCondominiumRequest,
  UpdateCondominiumRequest,
} from "./condominiums.schema";

export async function createCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateCondominiumRequest,
  userId: string
) {
  const existingCondominium = await prisma.condominium.findUnique({
    where: { cnpj: data.cnpj },
  });
  if (existingCondominium) {
    throw new ConflictError("CNPJ já cadastrado");
  }

  const condominium = await prisma.condominium.create({
    data: {
      name: data.name,
      cnpj: data.cnpj,
      status: "TRIAL",
      whatsappPhone: data.whatsappPhone,
      whatsappBusinessId: data.whatsappBusinessId,
    },
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
  const existing = await prisma.condominium.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new NotFoundError("Condomínio não encontrado");
  }

  if (data.cnpj && data.cnpj !== existing.cnpj) {
    const cnpjInUse = await prisma.condominium.findUnique({
      where: { cnpj: data.cnpj },
    });
    if (cnpjInUse) {
      throw new ConflictError("CNPJ já cadastrado");
    }
  }

  const condominium = await prisma.condominium.update({
    where: { id },
    data,
  });

  logger.info(`Condominium ${id} updated by ${userId}`);

  return condominium;
}

export async function deleteCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  userId: string
) {
  const existing = await prisma.condominium.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          residents: true,
          users: true,
        },
      },
    },
  });
  if (!existing) {
    throw new NotFoundError("Condomínio não encontrado");
  }

  if (existing._count.residents > 0 || existing._count.users > 0) {
    throw new ConflictError(
      `Este condomínio possui ${existing._count.residents} moradores e ${existing._count.users} usuários vinculados. Remova-os primeiro.`
    );
  }

  await prisma.condominium.delete({
    where: { id },
  });

  logger.info(`Condominium ${id} deleted by ${userId}`);
}

export async function getCondominiumById(prisma: PrismaClient, id: string) {
  return prisma.condominium.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          residents: true,
          users: true,
          complaints: true,
          messages: true,
        },
      },
    },
  });
}

export async function getAllCondominiums(prisma: PrismaClient) {
  return prisma.condominium.findMany({
    select: {
      id: true,
      name: true,
      cnpj: true,
      status: true,
      whatsappPhone: true,
      whatsappBusinessId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          residents: true,
          users: true,
          complaints: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getCondominiumStats(prisma: PrismaClient, id: string) {
  const [residentsCount, complaintsOpen, complaintsResolved, messagesCount] =
    await Promise.all([
      prisma.resident.count({ where: { condominiumId: id } }),
      prisma.complaint.count({ where: { condominiumId: id, status: "OPEN" } }),
      prisma.complaint.count({
        where: { condominiumId: id, status: "RESOLVED" },
      }),
      prisma.message.count({ where: { condominiumId: id } }),
    ]);

  return {
    residents: residentsCount,
    complaints: {
      open: complaintsOpen,
      resolved: complaintsResolved,
      total: complaintsOpen + complaintsResolved,
    },
    messages: messagesCount,
  };
}
