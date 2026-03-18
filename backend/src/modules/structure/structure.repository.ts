import { PrismaClient } from "@prisma/client";
import type { CondominiumStructure } from "./structure.schema";

const condominiumStructureSelect = {
  id: true,
  name: true,
  structure: true,
} as const;

export const findCondominiumStructure = (
  prisma: PrismaClient,
  condominiumId: string
) =>
  prisma.condominium.findUnique({
    where: { id: condominiumId },
    select: condominiumStructureSelect,
  });

export const updateCondominiumStructure = (
  prisma: PrismaClient,
  condominiumId: string,
  structure: CondominiumStructure
) =>
  prisma.condominium.update({
    where: { id: condominiumId },
    data: {
      structure: structure as unknown as CondominiumStructure,
    },
    select: condominiumStructureSelect,
  });
