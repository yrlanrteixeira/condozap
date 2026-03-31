import { Prisma, PrismaClient } from "@prisma/client";
import { AuthUser } from "../../types/auth";
import {
  AccessContext,
  resolveAccessContext,
  isCondominiumAllowed,
} from "../../auth/context";
import { isGlobalScope } from "../../auth/roles";
import { ResidentFilters } from "./residents.schema";

export const includeResident = {
  condominium: {
    select: {
      id: true,
      name: true,
    },
  },
  user: {
    select: {
      accountExpiresAt: true,
    },
  },
} as const;

export type ResidentWithInclude = Prisma.ResidentGetPayload<{
  include: typeof includeResident;
}>;

/** Achata `user.accountExpiresAt` para o JSON da API (compatível com o frontend). */
export function mapResidentForApi(row: ResidentWithInclude) {
  const { user, ...rest } = row;
  return {
    ...rest,
    accountExpiresAt: user?.accountExpiresAt ?? null,
  };
}

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
  const appliedCondoFilter = filters.condominiumId
    ? isCondominiumAllowed(context, filters.condominiumId)
      ? { in: [filters.condominiumId] }
      : { in: ["__deny__"] }
    : isGlobalScope(context.scope)
    ? undefined
    : { in: allowedIds.length ? allowedIds : ["__deny__"] };
  const rows = await prisma.resident.findMany({
    where: {
      ...(appliedCondoFilter && { condominiumId: appliedCondoFilter }),
      ...((context.assignedTower ?? filters.tower) && { tower: context.assignedTower ?? filters.tower }),
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
  return rows.map(mapResidentForApi);
};

export const findResidentByIdForUser = async (
  prisma: PrismaClient,
  user: AuthUser,
  id: string
) => {
  const context = await getAccessContext(prisma, user);
  const row = await prisma.resident.findFirst({
    where: {
      id,
      ...(isGlobalScope(context.scope)
        ? {}
        : { condominiumId: { in: context.allowedCondominiumIds } }),
    },
    include: includeResident,
  });
  return row ? mapResidentForApi(row) : null;
};
