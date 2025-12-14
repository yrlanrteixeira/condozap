import { PrismaClient } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { SetMembersBody, CreateSectorBody, UpdateSectorBody } from "./sectors.schema";

export const listSectors = async (
  prisma: PrismaClient,
  condominiumId: string
) =>
  prisma.sector.findMany({
    where: { condominiumId },
    include: {
      members: {
        where: { isActive: true },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ order: "asc" }, { workload: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

export const createSector = async (
  prisma: PrismaClient,
  condominiumId: string,
  body: CreateSectorBody
) => {
  const exists = await prisma.sector.findFirst({
    where: { condominiumId, name: body.name },
  });
  if (exists) {
    throw new BadRequestError("Setor já existe neste condomínio");
  }
  return prisma.sector.create({
    data: {
      condominiumId,
      name: body.name,
      categories: body.categories ?? [],
    },
  });
};

export const updateSector = async (
  prisma: PrismaClient,
  condominiumId: string,
  sectorId: string,
  body: UpdateSectorBody
) => {
  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, condominiumId },
  });
  if (!sector) {
    throw new NotFoundError("Setor");
  }
  if (body.name) {
    const duplicate = await prisma.sector.findFirst({
      where: {
        condominiumId,
        name: body.name,
        id: { not: sectorId },
      },
    });
    if (duplicate) {
      throw new BadRequestError("Já existe outro setor com este nome");
    }
  }
  return prisma.sector.update({
    where: { id: sectorId },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.categories && { categories: body.categories }),
    },
  });
};

export const setSectorMembers = async (
  prisma: PrismaClient,
  condominiumId: string,
  sectorId: string,
  body: SetMembersBody
) => {
  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, condominiumId },
  });
  if (!sector) {
    throw new NotFoundError("Setor");
  }
  const userIds = body.members.map((m) => m.userId);
  const memberships = await prisma.userCondominium.findMany({
    where: { condominiumId, userId: { in: userIds } },
  });
  const allowedUserIds = new Set(memberships.map((m) => m.userId));
  const invalid = userIds.filter((id) => !allowedUserIds.has(id));
  if (invalid.length) {
    throw new BadRequestError(
      `Usuários sem vínculo com o condomínio: ${invalid.join(", ")}`
    );
  }
  return prisma.$transaction(async (trx) => {
    await trx.sectorMember.deleteMany({
      where: {
        sectorId,
        userId: { notIn: userIds },
      },
    });
    for (const member of body.members) {
      await trx.sectorMember.upsert({
        where: {
          sectorId_userId: {
            sectorId,
            userId: member.userId,
          },
        },
        update: {
          order: member.order ?? 0,
          workload: member.workload ?? 0,
          isActive: member.isActive ?? true,
        },
        create: {
          sectorId,
          userId: member.userId,
          order: member.order ?? 0,
          workload: member.workload ?? 0,
          isActive: member.isActive ?? true,
        },
      });
    }
    return trx.sector.findUnique({
      where: { id: sectorId },
      include: {
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: [{ order: "asc" }, { workload: "asc" }],
        },
      },
    });
  });
};



