import { PrismaClient } from "@prisma/client";
import { NotFoundError, BadRequestError } from "../../shared/errors";
import type { UpdateStructureBody } from "./structure.schema";
import {
  findCondominiumStructure,
  updateCondominiumStructure,
} from "./structure.repository";

export async function getStructure(
  prisma: PrismaClient,
  condominiumId: string
) {
  const condominium = await findCondominiumStructure(prisma, condominiumId);
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

  const condominium = await findCondominiumStructure(prisma, condominiumId);
  if (!condominium) {
    throw new NotFoundError("Condomínio");
  }

  // Identify towers being removed
  const currentStructure = (condominium.structure as { towers: Array<{ name: string }> } | null);
  const currentTowerNames = new Set(
    currentStructure?.towers?.map((t) => t.name) ?? []
  );
  const newTowerNames = new Set(body.structure.towers.map((t) => t.name));
  const removedTowers = [...currentTowerNames].filter((name) => !newTowerNames.has(name));

  // Block deletion if any removed tower has residents
  for (const towerName of removedTowers) {
    const residentCount = await prisma.resident.count({
      where: { condominiumId, tower: towerName },
    });
    if (residentCount > 0) {
      throw new BadRequestError(
        `Torre "${towerName}" possui ${residentCount} morador(es). Realoque-os antes de excluir.`
      );
    }
  }

  const updated = await updateCondominiumStructure(
    prisma,
    condominiumId,
    body.structure
  );

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
