import { PrismaClient } from "@prisma/client";
import { Role, Scope, isGlobalScope } from "./roles";

export interface AccessContext {
  role: Role;
  scope: Scope;
  allowedCondominiumIds: string[];
  allowedSectorIds: string[];
}

export interface AccessUser {
  id: string;
  role: Role;
  permissionScope?: Scope;
}

export const resolveAccessContext = async (
  prisma: PrismaClient,
  user: AccessUser
): Promise<AccessContext> => {
  const scope = user.permissionScope ?? ("LOCAL" as Scope);
  if (isGlobalScope(scope)) {
    return {
      role: user.role,
      scope: "GLOBAL",
      allowedCondominiumIds: [],
      allowedSectorIds: [],
    };
  }
  const memberships = await prisma.userCondominium.findMany({
    where: { userId: user.id },
    select: { condominiumId: true },
  });
  const allowedCondominiumIds = Array.from(
    new Set(memberships.map((membership) => membership.condominiumId))
  );
  const sectorMemberships = await prisma.sectorMember.findMany({
    where: { userId: user.id, isActive: true },
    select: { sectorId: true, sector: { select: { condominiumId: true } } },
  });
  const allowedSectorIds = sectorMemberships
    .filter((membership) =>
      allowedCondominiumIds.includes(membership.sector.condominiumId)
    )
    .map((membership) => membership.sectorId);
  return {
    role: user.role,
    scope,
    allowedCondominiumIds,
    allowedSectorIds,
  };
};

export const isCondominiumAllowed = (
  context: AccessContext,
  condominiumId: string
): boolean =>
  isGlobalScope(context.scope) ||
  context.allowedCondominiumIds.includes(condominiumId);

