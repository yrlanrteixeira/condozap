import { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../shared/errors";
import type { CreateCannedResponseRequest, UpdateCannedResponseRequest } from "./canned-responses.schema";

export async function listCannedResponses(
  prisma: PrismaClient,
  condominiumId?: string,
  sectorId?: string
) {
  // Return all accessible templates:
  // 1. Global (condominiumId: null)
  // 2. Condominium-level (condominiumId: X, sectorId: null)
  // 3. All sector templates of this condominium (so syndic can use any template)
  //    Sector-matching templates are prioritized in ordering
  const where: any = {
    OR: [
      { condominiumId: null },
      ...(condominiumId ? [
        { condominiumId, sectorId: null },
        { condominiumId, sectorId: { not: null } },
      ] : []),
    ],
  };
  const results = await prisma.cannedResponse.findMany({
    where,
    orderBy: [{ condominiumId: "asc" }, { sectorId: "asc" }, { title: "asc" }],
    include: { sector: { select: { id: true, name: true } } },
  });

  // Sort: matching sector first, then other sectors, then condo-level, then global
  if (sectorId) {
    results.sort((a, b) => {
      const aMatch = a.sectorId === sectorId ? 0 : a.sectorId ? 1 : 2;
      const bMatch = b.sectorId === sectorId ? 0 : b.sectorId ? 1 : 2;
      return aMatch - bMatch || a.title.localeCompare(b.title);
    });
  }

  return results;
}

export async function createCannedResponse(
  prisma: PrismaClient,
  data: CreateCannedResponseRequest,
  userId: string
) {
  return prisma.cannedResponse.create({ data: { ...data, createdBy: userId } });
}

export async function updateCannedResponse(
  prisma: PrismaClient,
  id: string,
  data: UpdateCannedResponseRequest
) {
  const existing = await prisma.cannedResponse.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Resposta pré-cadastrada");
  return prisma.cannedResponse.update({ where: { id }, data });
}

export async function deleteCannedResponse(prisma: PrismaClient, id: string) {
  const existing = await prisma.cannedResponse.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Resposta pré-cadastrada");
  return prisma.cannedResponse.delete({ where: { id } });
}
