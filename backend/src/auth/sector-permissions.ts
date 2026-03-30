import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../shared/db/prisma";

export const SECTOR_ACTIONS = [
  "VIEW_COMPLAINTS",
  "COMMENT",
  "CHANGE_STATUS",
  "RESOLVE",
  "RETURN",
  "REASSIGN",
] as const;

export type SectorAction = (typeof SECTOR_ACTIONS)[number];

export const DEFAULT_SECTOR_PERMISSIONS: SectorAction[] = [
  "VIEW_COMPLAINTS",
  "COMMENT",
  "CHANGE_STATUS",
];

export async function resolveSectorMemberPermissions(
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

const STATUS_ACTION_MAP: Record<string, SectorAction> = {
  RESOLVED: "RESOLVE",
  RETURNED: "RETURN",
};

export const requireSectorAction = (action: SectorAction) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    // Skip for non-SETOR_MEMBER roles (they have full access)
    if (!user || user.role !== "SETOR_MEMBER") return;

    const complaintId = Number((request.params as any).id);
    if (isNaN(complaintId)) return reply.status(400).send({ error: "ID inválido" });

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint?.sectorId) return reply.status(403).send({ error: "Ocorrência sem setor" });

    const membership = await prisma.sectorMember.findFirst({
      where: { userId: user.id, sectorId: complaint.sectorId, isActive: true },
    });
    if (!membership) return reply.status(403).send({ error: "Você não pertence a este setor" });

    const permissions = await resolveSectorMemberPermissions(prisma, membership.id, complaint.sectorId);

    if (!permissions.has(action)) {
      return reply.status(403).send({ error: `Sem permissão para: ${action}` });
    }

    // For CHANGE_STATUS, check granular status-specific actions from body
    if (action === "CHANGE_STATUS") {
      const body = request.body as any;
      const targetStatus = body?.status as string;
      const requiredAction = STATUS_ACTION_MAP[targetStatus];
      if (requiredAction && !permissions.has(requiredAction)) {
        return reply.status(403).send({ error: `Sem permissão para: ${requiredAction}` });
      }
    }
  };
};
