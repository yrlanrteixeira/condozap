import { PrismaClient } from "@prisma/client";
import { NotFoundError, BadRequestError } from "../../shared/errors";
import type {
  CondominiumStructure,
  UpdateStructureBody,
} from "./structure.schema";

export async function getStructure(
  prisma: PrismaClient,
  condominiumId: string
) {
  const condominium = await prisma.condominium.findUnique({
    where: { id: condominiumId },
    select: {
      id: true,
      name: true,
      structure: true,
    },
  });
  if (!condominium) {
    throw new NotFoundError("Condomínio");
  }

  return {
    condominiumId: condominium.id,
    condominiumName: condominium.name,
    structure: condominium.structure || { towers: [] },
  };
}

export async function updateStructure(
  prisma: PrismaClient,
  condominiumId: string,
  body: UpdateStructureBody
) {
  validateStructure(body);

  const condominium = await prisma.condominium.findUnique({
    where: { id: condominiumId },
    select: {
      id: true,
      name: true,
      structure: true,
    },
  });
  if (!condominium) {
    throw new NotFoundError("Condomínio");
  }

  const updated = await prisma.condominium.update({
    where: { id: condominiumId },
    data: {
      structure: body.structure as unknown as CondominiumStructure,
    },
    select: {
      id: true,
      name: true,
      structure: true,
    },
  });

  return {
    condominiumId: updated.id,
    condominiumName: updated.name,
    structure: updated.structure,
  };
}

function validateStructure(body: UpdateStructureBody) {
  if (!body.structure || !Array.isArray(body.structure.towers)) {
    throw new BadRequestError("Estrutura inválida. Esperado: { towers: [...] }");
  }

  for (const tower of body.structure.towers) {
    if (!tower.name || !Array.isArray(tower.floors) || !tower.unitsPerFloor) {
      throw new BadRequestError(
        "Torre inválida. Cada torre precisa ter name, floors e unitsPerFloor"
      );
    }
  }
}

