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

const updateSectorMemberBodySchema = z.object({
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  workload: z.number().int().min(0).optional(),
});

export const updateSectorMemberHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const actor = (request.user as AuthUser).id;
  const ip = request.ip ?? "0.0.0.0";

  const { condominiumId, sectorId, memberId } =
    memberPermissionsParamsSchema.parse(request.params);

  const body = updateSectorMemberBodySchema.parse(request.body);

  const sectorMember = await prisma.sectorMember.findFirst({
    where: { id: memberId, sectorId, sector: { condominiumId } },
    include: { user: { select: { name: true } } },
  });

  if (!sectorMember) {
    return reply
      .status(404)
      .send({ error: "Membro do setor não encontrado" });
  }

  const updated = await prisma.sectorMember.update({
    where: { id: memberId },
    data: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.workload !== undefined && { workload: body.workload }),
    },
  });

  await prisma.auditLog.create({
    data: buildAuditLogData({
      actorUserId: actor,
      action: "sector_member.update",
      resource: `condominium:${condominiumId}:sector:${sectorId}:member:${memberId}`,
      metadata: body,
      ipAddress: ip,
    }),
  });

  return reply.send({
    id: updated.id,
    userId: sectorMember.userId,
    userName: sectorMember.user.name,
    isActive: updated.isActive,
    order: updated.order,
    workload: updated.workload,
  });
};

export const getAvailableMembersHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { condominiumId, sectorId } = sectorPermissionsParamsSchema.parse(
    request.params
  );

  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, condominiumId },
    select: { id: true },
  });

  if (!sector) {
    return reply.status(404).send({ error: "Setor não encontrado" });
  }

  const members = await prisma.sectorMember.findMany({
    where: { sectorId },
    select: { userId: true },
  });
  const memberUserIds = members.map((m) => m.userId);

  const availableUsers = await prisma.userCondominium.findMany({
    where: {
      condominiumId,
      role: { in: ["ADMIN", "SETOR_MANAGER", "SETOR_MEMBER", "TRIAGE"] },
      user: { status: "APPROVED" },
    },
    select: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    distinct: ["userId"],
  });

  const filtered = availableUsers
    .map((uc) => uc.user)
    .filter((u) => !memberUserIds.includes(u.id));

  return reply.send(filtered);
};

const addMemberBodySchema = z.object({
  userId: z.string().min(1),
  order: z.number().int().min(0).optional(),
  workload: z.number().int().min(0).optional(),
});

export const addMemberToSectorHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const actor = (request.user as AuthUser).id;
  const ip = request.ip ?? "0.0.0.0";

  const { condominiumId, sectorId } = sectorPermissionsParamsSchema.parse(
    request.params
  );

  const body = addMemberBodySchema.parse(request.body);

  const sector = await prisma.sector.findFirst({
    where: { id: sectorId, condominiumId },
    select: { id: true },
  });

  if (!sector) {
    return reply.status(404).send({ error: "Setor não encontrado" });
  }

  const existingMember = await prisma.sectorMember.findFirst({
    where: {
      sectorId,
      userId: body.userId,
    },
  });

  if (existingMember) {
    return reply.status(400).send({ error: "Usuário já é membro deste setor" });
  }

  const membership = await prisma.userCondominium.findFirst({
    where: {
      condominiumId,
      userId: body.userId,
    },
  });

  if (!membership) {
    return reply.status(400).send({ error: "Usuário não tem vínculo com este condomínio" });
  }

  const newMember = await prisma.sectorMember.create({
    data: {
      sectorId,
      userId: body.userId,
      order: body.order ?? 0,
      workload: body.workload ?? 100,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: buildAuditLogData({
      actorUserId: actor,
      action: "sector_member.add",
      resource: `condominium:${condominiumId}:sector:${sectorId}:member:${body.userId}`,
      metadata: body,
      ipAddress: ip,
    }),
  });

  return reply.status(201).send({
    id: newMember.id,
    userId: body.userId,
    isActive: true,
    order: newMember.order,
    workload: newMember.workload,
  });
};
