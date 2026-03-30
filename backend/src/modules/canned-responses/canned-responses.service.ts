import { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../shared/errors";
import type { CreateCannedResponseRequest, UpdateCannedResponseRequest } from "./canned-responses.schema";

export async function listCannedResponses(
  prisma: PrismaClient,
  condominiumId?: string,
  sectorId?: string
) {
  const where: any = {
    OR: [
      { condominiumId: null },
      ...(condominiumId ? [
        { condominiumId, sectorId: null },
        ...(sectorId ? [{ condominiumId, sectorId }] : []),
      ] : []),
    ],
  };
  return prisma.cannedResponse.findMany({
    where,
    orderBy: [{ condominiumId: "asc" }, { sectorId: "asc" }, { title: "asc" }],
    include: { sector: { select: { name: true } } },
  });
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
