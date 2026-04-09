import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../shared/db/prisma";
import { getEffectivePermissionsForCondominiumMembership } from "./effective-permissions";

/** Chaves canônicas para permissões de setor em ocorrências (alinhadas ao frontend). */
export const SECTOR_COMPLAINT_PERMISSIONS = [
  "view:complaints",
  "comment:complaint",
  "update:complaint_status",
  "resolve:complaint",
  "return:complaint",
  "reassign:complaint",
] as const;

export type SectorComplaintPermission =
  (typeof SECTOR_COMPLAINT_PERMISSIONS)[number];

export const DEFAULT_SECTOR_PERMISSIONS: SectorComplaintPermission[] = [
  "view:complaints",
  "comment:complaint",
  "update:complaint_status",
];

export async function resolveSectorMemberPermissions(
  prismaClient: PrismaClient,
  sectorMemberId: string,
  sectorId: string
): Promise<Set<string>> {
  const sectorPerms = await prismaClient.sectorPermission.findMany({
    where: { sectorId },
    select: { action: true },
  });
  const allowed = new Set(sectorPerms.map((p) => p.action));

  const overrides = await prismaClient.sectorMemberPermissionOverride.findMany({
    where: { sectorMemberId },
    select: { action: true, granted: true },
  });
  for (const override of overrides) {
    if (override.granted) allowed.add(override.action);
    else allowed.delete(override.action);
  }

  return allowed;
}

const STATUS_TO_EXTRA: Record<string, "resolve:complaint" | "return:complaint"> =
  {
    RESOLVED: "resolve:complaint",
    RETURNED: "return:complaint",
  };

/**
 * Para rotas de ocorrência: valida permissão granular no conjunto efetivo (SETOR_MEMBER).
 * Outros papéis não são bloqueados aqui (fluxo existente em requireTicketModify).
 */
export const requireSectorComplaintPermission = (
  primaryKey: SectorComplaintPermission
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "SETOR_MEMBER") return;

    const complaintId = Number((request.params as { id?: string }).id);
    if (Number.isNaN(complaintId)) {
      return reply.status(400).send({ error: "ID inválido" });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { condominiumId: true, sectorId: true },
    });
    if (!complaint?.sectorId) {
      return reply.status(403).send({ error: "Ocorrência sem setor" });
    }

    const membership = await prisma.sectorMember.findFirst({
      where: {
        userId: user.id,
        sectorId: complaint.sectorId,
        isActive: true,
      },
    });
    if (!membership) {
      return reply.status(403).send({ error: "Você não pertence a este setor" });
    }

    const perms = await getEffectivePermissionsForCondominiumMembership(
      prisma,
      user.id,
      complaint.condominiumId
    );

    if (!perms.includes(primaryKey)) {
      return reply
        .status(403)
        .send({ error: `Sem permissão para: ${primaryKey}` });
    }

    if (primaryKey === "update:complaint_status") {
      const body = request.body as { status?: string } | undefined;
      const targetStatus = body?.status;
      const extra = targetStatus ? STATUS_TO_EXTRA[targetStatus] : undefined;
      if (extra && !perms.includes(extra)) {
        return reply.status(403).send({ error: `Sem permissão para: ${extra}` });
      }
    }
  };
};
