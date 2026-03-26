import {
  ComplaintPriority,
  ComplaintStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { AuthUser } from "../../types/auth";
import { resolveAccessContext } from "../../auth/context";
import {
  isGlobalScope,
  isResident,
  isSectorRole,
  isSyndic,
} from "../../auth/roles";

export interface ComplaintQueryFilters {
  id?: number;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: string;
  condominiumId?: string;
  sectorId?: string;
  assigneeId?: string;
  residentId?: string;
}

const complaintIncludes = {
  condominium: {
    select: { id: true, name: true },
  },
  resident: {
    select: {
      id: true,
      name: true,
      phone: true,
      tower: true,
      floor: true,
      unit: true,
    },
  },
  attachments: true,
  statusHistory: {
    orderBy: { createdAt: "desc" },
  },
  sector: true,
  assignee: {
    select: { id: true, name: true, email: true },
  },
  assignments: {
    orderBy: { createdAt: "desc" },
    include: {
      assignee: true,
      assignedByUser: true,
      sector: true,
    },
  },
} satisfies Prisma.ComplaintInclude;

const buildBaseFilters = (
  filters: ComplaintQueryFilters
): Prisma.ComplaintWhereInput => ({
  ...(filters.id && { id: filters.id }),
  ...(filters.status && { status: filters.status }),
  ...(filters.priority && { priority: filters.priority }),
  ...(filters.category && { category: filters.category }),
  ...(filters.condominiumId && { condominiumId: filters.condominiumId }),
  ...(filters.sectorId && { sectorId: filters.sectorId }),
  ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
  ...(filters.residentId && { residentId: filters.residentId }),
});

const buildAccessFilteredWhere = async (
  prisma: PrismaClient,
  user: AuthUser,
  filters: ComplaintQueryFilters
): Promise<Prisma.ComplaintWhereInput> => {
  const context = await resolveAccessContext(prisma, {
    id: user.id,
    role: user.role,
    permissionScope: user.permissionScope as any,
  });
  const where: Prisma.ComplaintWhereInput = buildBaseFilters(filters);
  if (!isGlobalScope(context.scope)) {
    const condoIds =
      filters.condominiumId && context.allowedCondominiumIds.length > 0
        ? context.allowedCondominiumIds.includes(filters.condominiumId)
          ? [filters.condominiumId]
          : []
        : context.allowedCondominiumIds;
    where.condominiumId = { in: condoIds.length ? condoIds : ["__deny__"] };
  }
  if (isResident(user.role)) {
    where.residentId = user.residentId ?? "__no_resident__";
  }
  if (isSectorRole(user.role)) {
    const sectorIds = context.allowedSectorIds;
    where.OR = [
      { sectorId: sectorIds.length ? { in: sectorIds } : "__no_sector__" },
      { assigneeId: user.id },
    ];
  }
  if (isSyndic(user.role)) {
    where.OR = undefined;
  }
  return where;
};

export const findComplaintsForUser = async (
  prisma: PrismaClient,
  user: AuthUser,
  filters: ComplaintQueryFilters
) =>
  prisma.complaint.findMany({
    where: await buildAccessFilteredWhere(prisma, user, filters),
    include: complaintIncludes,
    orderBy: [{ createdAt: "desc" }],
  });

export const findComplaintByIdForUser = async (
  prisma: PrismaClient,
  user: AuthUser,
  id: number
) =>
  prisma.complaint.findFirst({
    where: await buildAccessFilteredWhere(prisma, user, { id }),
    include: complaintIncludes,
  });

export const findComplaintByIdUnsafe = (
  prisma: PrismaClient,
  id: number
) =>
  prisma.complaint.findUnique({
    where: { id },
    include: complaintIncludes,
  });

export const complaintIncludeSelection = complaintIncludes;

