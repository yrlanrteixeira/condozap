import { PrismaClient } from "@prisma/client";
import type { CondominiumStructure } from "./structure.types";

export async function findStructureByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  return prisma.condominium.findUnique({
    where: { id: condominiumId },
    select: {
      id: true,
      name: true,
      structure: true,
    },
  });
}

export async function updateStructureByCondominium(
  prisma: PrismaClient,
  condominiumId: string,
  structure: CondominiumStructure
) {
  return prisma.condominium.update({
    where: { id: condominiumId },
    data: {
      structure: structure as any,
    },
    select: {
      id: true,
      name: true,
      structure: true,
    },
  });
}

