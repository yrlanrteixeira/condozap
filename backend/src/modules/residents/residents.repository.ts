import { PrismaClient } from "@prisma/client";
import { AuthUser } from "../../types/auth";
import {
  AccessContext,
  resolveAccessContext,
  isCondominiumAllowed,
} from "../../auth/context";
import { isSuperAdmin } from "../../auth/roles";
import { ResidentFilters } from "./residents.schema";

const includeResident = {
  condominium: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export const getAccessContext = async (
  prisma: PrismaClient,
  user: AuthUser
): Promise<AccessContext> =>
  resolveAccessContext(prisma, {
    id: user.id,
    role: user.role,
    permissionScope: user.permissionScope as any,
  });

export const findResidentsForUser = async (
  prisma: PrismaClient,
  user: AuthUser,
  filters: ResidentFilters
) => {
  const context = await getAccessContext(prisma, user);
  const allowedIds = context.allowedCondominiumIds;
  const appliedCondoFilter = isSuperAdmin(context.role)
    ? undefined
    : filters.condominiumId
    ? isCondominiumAllowed(context, filters.condominiumId)
      ? { in: [filters.condominiumId] }
      : { in: ["__deny__"] }
    : { in: allowedIds.length ? allowedIds : ["__deny__"] };
  return prisma.resident.findMany({
    where: {
      ...(appliedCondoFilter && { condominiumId: appliedCondoFilter }),
      ...(filters.tower && { tower: filters.tower }),
      ...(filters.floor && { floor: filters.floor }),
      ...(filters.type && { type: filters.type as any }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search } },
        ],
      }),
    },
    include: includeResident,
    orderBy: [
      { condominium: { name: "asc" } },
      { tower: "asc" },
      { floor: "asc" },
      { unit: "asc" },
    ],
  });
};

export const findResidentByIdForUser = async (
  prisma: PrismaClient,
  user: AuthUser,
  id: string
) => {
  const context = await getAccessContext(prisma, user);
  return prisma.resident.findFirst({
    where: {
      id,
      ...(isSuperAdmin(context.role)
        ? {}
        : { condominiumId: { in: context.allowedCondominiumIds } }),
    },
    include: includeResident,
  });
};
