import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { isSectorAssignableKey } from "../../auth/permission-catalog";
import type { AuthUser } from "../../types/auth";
import { buildAuditLogData } from "../../shared/audit/write-audit-log";

const sectorPermissionsParamsSchema = z.object({
  condominiumId: z.string().min(1),
  sectorId: z.string().min(1),
});

const memberPermissionsParamsSchema = z.object({
  condominiumId: z.string().min(1),
  sectorId: z.string().min(1),
  memberId: z.string().min(1),
});

const permissionKey = z.string().refine(isSectorAssignableKey, "Permissão inválida");

const updateSectorPermissionsBodySchema = z.object({
  actions: z.array(permissionKey),
});

const updateMemberOverridesBodySchema = z.object({
  overrides: z.array(
    z.object({
      action: permissionKey,
      granted: z.boolean(),
    })
  ),
});

export const getSectorPermissionsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { condominiumId, sectorId } = sectorPermissionsParamsSchema.parse(
    request.params
  );

  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, condominiumId },
    include: {
      permissions: {
        select: { action: true },
      },
      members: {
        where: { isActive: true },
        include: {
          user: {
            select: { id: true, name: true },
          },
          permissionOverrides: {
            select: { action: true, granted: true },
          },
        },
      },
    },
  });

  if (!sector) {
    return reply.status(404).send({ error: "Setor não encontrado" });
  }

  const sectorPermissions = sector.permissions.map((p) => p.action);

  const memberOverrides = sector.members.map((member) => ({
    memberId: member.id,
    memberName: member.user.name,
    overrides: member.permissionOverrides.map((o) => ({
      action: o.action,
      granted: o.granted,
    })),
  }));

  return reply.send({ sectorPermissions, memberOverrides });
};

export const updateSectorPermissionsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const actor = (request.user as AuthUser).id;
  const ip = request.ip ?? "0.0.0.0";

  const { condominiumId, sectorId } = sectorPermissionsParamsSchema.parse(
    request.params
  );

  const { actions } = updateSectorPermissionsBodySchema.parse(request.body);

  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, condominiumId },
    select: { id: true },
  });

  if (!sector) {
    return reply.status(404).send({ error: "Setor não encontrado" });
  }

  await prisma.$transaction([
    prisma.sectorPermission.deleteMany({ where: { sectorId } }),
    prisma.sectorPermission.createMany({
      data: actions.map((action) => ({ sectorId, action })),
    }),
    prisma.auditLog.create({
      data: buildAuditLogData({
        actorUserId: actor,
        action: "sector_permissions.update",
        resource: `condominium:${condominiumId}:sector:${sectorId}`,
        metadata: { actions },
        ipAddress: ip,
      }),
    }),
  ]);

  return reply.send({ sectorId, actions });
};

export const updateMemberPermissionOverridesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const actor = (request.user as AuthUser).id;
  const ip = request.ip ?? "0.0.0.0";

  const { condominiumId, sectorId, memberId } =
    memberPermissionsParamsSchema.parse(request.params);

  const { overrides } = updateMemberOverridesBodySchema.parse(request.body);

  const sectorMember = await prisma.sectorMember.findFirst({
    where: { id: memberId, sectorId, sector: { condominiumId } },
    select: { id: true },
  });

  if (!sectorMember) {
    return reply
      .status(404)
      .send({ error: "Membro do setor não encontrado" });
  }

  await prisma.$transaction([
    prisma.sectorMemberPermissionOverride.deleteMany({
      where: { sectorMemberId: memberId },
    }),
    prisma.sectorMemberPermissionOverride.createMany({
      data: overrides.map((o) => ({
        sectorMemberId: memberId,
        action: o.action,
        granted: o.granted,
      })),
    }),
    prisma.auditLog.create({
      data: buildAuditLogData({
        actorUserId: actor,
        action: "sector_member_overrides.update",
        resource: `condominium:${condominiumId}:sector:${sectorId}:member:${memberId}`,
        metadata: { overrides },
        ipAddress: ip,
      }),
    }),
  ]);

  return reply.send({ memberId, overrides });
};
