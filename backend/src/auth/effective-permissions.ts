import type { PrismaClient } from "@prisma/client";
import { CondominiumPermissionMode, UserRole } from "@prisma/client";
import {
  getRoleCeiling,
  intersectPermissions,
} from "./role-permissions";

/**
 * Permissões efetivas para vários condomínios em poucas queries (uso em GET /me).
 */
export async function getEffectivePermissionsForCondominiums(
  prisma: PrismaClient,
  userId: string,
  condominiumIds: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (condominiumIds.length === 0) {
    return result;
  }

  const ucs = await prisma.userCondominium.findMany({
    where: { userId, condominiumId: { in: condominiumIds } },
    include: { customPermissions: { select: { action: true } } },
  });
  const ucByCondo = new Map(ucs.map((uc) => [uc.condominiumId, uc]));

  const sectorMembers = await prisma.sectorMember.findMany({
    where: {
      userId,
      isActive: true,
      sector: { condominiumId: { in: condominiumIds } },
    },
    select: {
      id: true,
      sectorId: true,
      sector: { select: { condominiumId: true } },
    },
  });

  const sectorIds = [...new Set(sectorMembers.map((s) => s.sectorId))];

  const sectorPermsRows =
    sectorIds.length > 0
      ? await prisma.sectorPermission.findMany({
          where: { sectorId: { in: sectorIds } },
          select: { sectorId: true, action: true },
        })
      : [];

  const sectorPermsBySectorId = new Map<string, Set<string>>();
  for (const row of sectorPermsRows) {
    if (!sectorPermsBySectorId.has(row.sectorId)) {
      sectorPermsBySectorId.set(row.sectorId, new Set());
    }
    sectorPermsBySectorId.get(row.sectorId)!.add(row.action);
  }

  const smIds = sectorMembers.map((m) => m.id);
  const overridesRows =
    smIds.length > 0
      ? await prisma.sectorMemberPermissionOverride.findMany({
          where: { sectorMemberId: { in: smIds } },
          select: { sectorMemberId: true, action: true, granted: true },
        })
      : [];

  const overridesByMemberId = new Map<
    string,
    { action: string; granted: boolean }[]
  >();
  for (const o of overridesRows) {
    if (!overridesByMemberId.has(o.sectorMemberId)) {
      overridesByMemberId.set(o.sectorMemberId, []);
    }
    overridesByMemberId.get(o.sectorMemberId)!.push(o);
  }

  const resolveMemberPerms = (
    sectorMemberId: string,
    sectorId: string
  ): Set<string> => {
    const base = new Set(sectorPermsBySectorId.get(sectorId) ?? []);
    const ov = overridesByMemberId.get(sectorMemberId) ?? [];
    for (const o of ov) {
      if (o.granted) base.add(o.action);
      else base.delete(o.action);
    }
    return base;
  };

  const membersByCondo = new Map<string, typeof sectorMembers>();
  for (const sm of sectorMembers) {
    const cid = sm.sector.condominiumId;
    if (!membersByCondo.has(cid)) {
      membersByCondo.set(cid, []);
    }
    membersByCondo.get(cid)!.push(sm);
  }

  for (const condoId of condominiumIds) {
    const uc = ucByCondo.get(condoId);
    if (!uc) {
      result.set(condoId, []);
      continue;
    }

    const role = uc.role as UserRole;
    const ceiling = getRoleCeiling(role);

    if (role === "SYNDIC" || role === "PROFESSIONAL_SYNDIC") {
      result.set(condoId, ceiling);
      continue;
    }

    const sms = membersByCondo.get(condoId) ?? [];
    const sectorUnion = new Set<string>();
    for (const sm of sms) {
      const set = resolveMemberPerms(sm.id, sm.sectorId);
      for (const x of set) {
        sectorUnion.add(x);
      }
    }

    const customRows = uc.customPermissions.map((p) => p.action);

    if (uc.permissionMode === CondominiumPermissionMode.ROLE_DEFAULT) {
      if (sms.length > 0) {
        result.set(condoId, intersectPermissions(ceiling, [...sectorUnion]));
      } else {
        result.set(condoId, ceiling);
      }
      continue;
    }

    const requested = [...new Set([...customRows, ...sectorUnion])];
    result.set(condoId, intersectPermissions(ceiling, requested));
  }

  return result;
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
  const map = await getEffectivePermissionsForCondominiums(prisma, userId, [
    condominiumId,
  ]);
  return map.get(condominiumId) ?? [];
}
