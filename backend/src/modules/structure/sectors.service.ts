import { PrismaClient } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { SetMembersBody, CreateSectorBody, UpdateSectorBody } from "./sectors.schema";
import { DEFAULT_SECTOR_PERMISSIONS } from "../../auth/sector-permissions";
import {
  findSectors,
  findByNameInCondominium,
  findSectorInCondominium,
  findSectorCategories,
  createSector as repoCreateSector,
  updateSector as repoUpdateSector,
  findUserMemberships,
  deleteRemovedSectorMembers,
  upsertSectorMember,
  findSectorWithMembers,
  deleteAllSectorMembers,
  deleteSector as repoDeleteSector,
} from "./sectors.repository";

export const listSectors = async (
  prisma: PrismaClient,
  condominiumId: string
) => findSectors(prisma, condominiumId);

export const getSectorCategories = async (
  prisma: PrismaClient,
  condominiumId: string
) => findSectorCategories(prisma, condominiumId);

export const createSector = async (
  prisma: PrismaClient,
  condominiumId: string,
  body: CreateSectorBody
) => {
  const exists = await findByNameInCondominium(prisma, condominiumId, body.name);
  if (exists) {
    throw new BadRequestError("Setor já existe neste condomínio");
  }
  const sector = await repoCreateSector(prisma, {
    condominiumId,
    name: body.name,
    categories: body.categories ?? [],
  });
  await prisma.sectorPermission.createMany({
    data: DEFAULT_SECTOR_PERMISSIONS.map((action) => ({
      sectorId: sector.id,
      action,
    })),
  });
  return sector;
};

export const updateSector = async (
  prisma: PrismaClient,
  condominiumId: string,
  sectorId: string,
  body: UpdateSectorBody
) => {
  const sector = await findSectorInCondominium(prisma, condominiumId, sectorId);
  if (!sector) {
    throw new NotFoundError("Setor");
  }
  if (body.name) {
    const duplicate = await findByNameInCondominium(
      prisma,
      condominiumId,
      body.name,
      sectorId
    );
    if (duplicate) {
      throw new BadRequestError("Já existe outro setor com este nome");
    }
  }
  return repoUpdateSector(prisma, sectorId, {
    ...(body.name && { name: body.name }),
    ...(body.categories && { categories: body.categories }),
  });
};

export const setSectorMembers = async (
  prisma: PrismaClient,
  condominiumId: string,
  sectorId: string,
  body: SetMembersBody
) => {
  const sector = await findSectorInCondominium(prisma, condominiumId, sectorId);
  if (!sector) {
    throw new NotFoundError("Setor");
  }
  const userIds = body.members.map((m) => m.userId);
  const memberships = await findUserMemberships(prisma, condominiumId, userIds);
  const allowedUserIds = new Set(memberships.map((m) => m.userId));
  const invalid = userIds.filter((id) => !allowedUserIds.has(id));
  if (invalid.length) {
    throw new BadRequestError(
      `Usuários sem vínculo com o condomínio: ${invalid.join(", ")}`
    );
  }
  return prisma.$transaction(async (trx) => {
    await deleteRemovedSectorMembers(trx as unknown as PrismaClient, sectorId, userIds);
    for (const member of body.members) {
      await upsertSectorMember(trx as unknown as PrismaClient, sectorId, member);
    }
    return findSectorWithMembers(trx as unknown as PrismaClient, sectorId);
  });
};

export const deleteSector = async (
  prisma: PrismaClient,
  condominiumId: string,
  sectorId: string
) => {
  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, condominiumId },
    select: { id: true, _count: { select: { complaints: true } } },
  });
  if (!sector) {
    throw new NotFoundError("Setor");
  }
  if (sector._count.complaints > 0) {
    throw new BadRequestError(
      "Setor possui chamados vinculados e não pode ser removido"
    );
  }
  return prisma.$transaction(async (trx) => {
    await deleteAllSectorMembers(trx as unknown as PrismaClient, sectorId);
    await repoDeleteSector(trx as unknown as PrismaClient, sectorId);
  });
};
