import type { PrismaClient } from "@prisma/client";
import { CondominiumPermissionMode, UserRole } from "@prisma/client";
import {
  getRoleCeiling,
  intersectPermissions,
} from "./role-permissions";

function unionSets(a: Set<string>, b: Iterable<string>): void {
  for (const x of b) a.add(x);
}

async function resolveSectorMemberPermissionsSet(
  prisma: PrismaClient,
  sectorMemberId: string,
  sectorId: string
): Promise<Set<string>> {
  const sectorPerms = await prisma.sectorPermission.findMany({
    where: { sectorId },
    select: { action: true },
  });
  const allowed = new Set(sectorPerms.map((p) => p.action));

  const overrides = await prisma.sectorMemberPermissionOverride.findMany({
    where: { sectorMemberId },
    select: { action: true, granted: true },
  });
  for (const override of overrides) {
    if (override.granted) allowed.add(override.action);
    else allowed.delete(override.action);
  }

  return allowed;
}

/**
 * Permissões efetivas no condomínio para o vínculo (teto do papel ∩ fontes modulares).
 * SYNDIC e PROFESSIONAL_SYNDIC: sempre teto completo do papel (ignora CUSTOM no vínculo).
 */
export async function getEffectivePermissionsForCondominiumMembership(
  prisma: PrismaClient,
  userId: string,
  condominiumId: string
): Promise<string[]> {
  const uc = await prisma.userCondominium.findUnique({
    where: {
      userId_condominiumId: { userId, condominiumId },
    },
    include: {
      customPermissions: { select: { action: true } },
    },
  });

  if (!uc) {
    return [];
  }

  const role = uc.role as UserRole;
  const ceiling = getRoleCeiling(role);

  if (role === "SYNDIC" || role === "PROFESSIONAL_SYNDIC") {
    return ceiling;
  }

  const sectorMembers = await prisma.sectorMember.findMany({
    where: {
      userId,
      isActive: true,
      sector: { condominiumId },
    },
    select: { id: true, sectorId: true },
  });

  const sectorUnion = new Set<string>();
  for (const sm of sectorMembers) {
    const set = await resolveSectorMemberPermissionsSet(
      prisma,
      sm.id,
      sm.sectorId
    );
    unionSets(sectorUnion, set);
  }

  const customRows = uc.customPermissions.map((p) => p.action);

  if (uc.permissionMode === CondominiumPermissionMode.ROLE_DEFAULT) {
    if (sectorMembers.length > 0) {
      return intersectPermissions(ceiling, [...sectorUnion]);
    }
    return ceiling;
  }

  const requested = [...new Set([...customRows, ...sectorUnion])];
  return intersectPermissions(ceiling, requested);
}
