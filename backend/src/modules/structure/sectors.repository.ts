import { Prisma, PrismaClient } from "@prisma/client";

const sectorWithMembersInclude = {
  members: {
    where: { isActive: true },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ order: "asc" as const }, { workload: "asc" as const }],
  },
} satisfies Prisma.SectorInclude;

export const findSectors = (prisma: PrismaClient, condominiumId: string) =>
  prisma.sector.findMany({
    where: { condominiumId },
    include: sectorWithMembersInclude,
    orderBy: { name: "asc" },
  });

export const findSectorCategories = (prisma: PrismaClient, condominiumId: string) =>
  prisma.sector.findMany({
    where: { condominiumId },
    select: { categories: true },
  }).then((sectors) => {
    const allCategories = sectors.flatMap((s) => s.categories ?? []);
    return [...new Set(allCategories)].sort();
  });

export const findByNameInCondominium = (
  prisma: PrismaClient,
  condominiumId: string,
  name: string,
  excludeId?: string
) =>
  prisma.sector.findFirst({
    where: {
      condominiumId,
      name,
      ...(excludeId && { id: { not: excludeId } }),
    },
  });

export const findSectorInCondominium = (
  prisma: PrismaClient,
  condominiumId: string,
  sectorId: string
) =>
  prisma.sector.findFirst({
    where: { id: sectorId, condominiumId },
  });

export const createSector = (
  prisma: PrismaClient,
  data: {
    condominiumId: string;
    name: string;
    categories: string[];
  }
) =>
  prisma.sector.create({ data });

export const updateSector = (
  prisma: PrismaClient,
  sectorId: string,
  data: { name?: string; categories?: string[] }
) =>
  prisma.sector.update({
    where: { id: sectorId },
    data,
  });

export const findUserMemberships = (
  prisma: PrismaClient,
  condominiumId: string,
  userIds: string[]
) =>
  prisma.userCondominium.findMany({
    where: { condominiumId, userId: { in: userIds } },
  });

export const deleteRemovedSectorMembers = (
  prisma: PrismaClient,
  sectorId: string,
  keepUserIds: string[]
) =>
  prisma.sectorMember.deleteMany({
    where: {
      sectorId,
      userId: { notIn: keepUserIds },
    },
  });

export const upsertSectorMember = (
  prisma: PrismaClient,
  sectorId: string,
  member: { userId: string; order?: number; workload?: number; isActive?: boolean }
) =>
  prisma.sectorMember.upsert({
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

export const findSectorWithMembers = (prisma: PrismaClient, sectorId: string) =>
  prisma.sector.findUnique({
    where: { id: sectorId },
    include: sectorWithMembersInclude,
  });

export const countComplaintsBySector = (prisma: PrismaClient, sectorId: string) =>
  prisma.complaint.count({
    where: { sectorId },
  });

export const deleteAllSectorMembers = (prisma: PrismaClient, sectorId: string) =>
  prisma.sectorMember.deleteMany({
    where: { sectorId },
  });

export const deleteSector = (prisma: PrismaClient, sectorId: string) =>
  prisma.sector.delete({
    where: { id: sectorId },
  });
