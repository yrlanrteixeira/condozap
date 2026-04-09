import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { CondominiumPermissionMode, Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import {
  CONDO_ASSIGNABLE_PERMISSION_KEYS,
  SECTOR_ASSIGNABLE_PERMISSION_KEYS,
  isCondoAssignableKey,
} from "../../auth/permission-catalog";
import { getEffectivePermissionsForCondominiumMembership } from "../../auth/effective-permissions";
import type { AuthUser } from "../../types/auth";
import { buildAuditLogData } from "../../shared/audit/write-audit-log";

const paramsSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

const putBodySchema = z.object({
  permissionMode: z.nativeEnum(CondominiumPermissionMode),
  actions: z.array(z.string()),
});

export const getPermissionsCatalogHandler = async (
  _request: FastifyRequest,
  reply: FastifyReply
) => {
  return reply.send({
    keys: [...CONDO_ASSIGNABLE_PERMISSION_KEYS],
    sectorKeys: [...SECTOR_ASSIGNABLE_PERMISSION_KEYS],
  });
};

export const getMembershipPermissionsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { id: condominiumId, userId: targetUserId } = paramsSchema.parse(
    request.params
  );

  const uc = await prisma.userCondominium.findUnique({
    where: {
      userId_condominiumId: {
        userId: targetUserId,
        condominiumId,
      },
    },
    include: {
      customPermissions: { select: { action: true } },
    },
  });

  if (!uc) {
    return reply.status(404).send({ error: "Vínculo não encontrado" });
  }

  const actions = uc.customPermissions.map((p) => p.action);
  const effectivePermissions =
    await getEffectivePermissionsForCondominiumMembership(
      prisma,
      targetUserId,
      condominiumId
    );

  return reply.send({
    userCondominiumId: uc.id,
    permissionMode: uc.permissionMode,
    actions,
    effectivePermissions,
  });
};

export const putMembershipPermissionsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const actor = (request.user as AuthUser).id;
  const ip = request.ip ?? "0.0.0.0";

  const { id: condominiumId, userId: targetUserId } = paramsSchema.parse(
    request.params
  );

  const body = putBodySchema.parse(request.body);

  if (actor === targetUserId) {
    return reply.status(400).send({
      error: "Não é permitido alterar as próprias permissões.",
    });
  }

  for (const a of body.actions) {
    if (!isCondoAssignableKey(a)) {
      return reply.status(400).send({ error: `Permissão não permitida: ${a}` });
    }
  }

  const uc = await prisma.userCondominium.findUnique({
    where: {
      userId_condominiumId: {
        userId: targetUserId,
        condominiumId,
      },
    },
  });

  if (!uc) {
    return reply.status(404).send({ error: "Vínculo não encontrado" });
  }

  if (uc.role === "SYNDIC" || uc.role === "PROFESSIONAL_SYNDIC") {
    return reply.status(400).send({
      error: "Permissões de síndico não são personalizadas por vínculo.",
    });
  }

  const auditData = buildAuditLogData({
    actorUserId: actor,
    action: "membership_permissions.update",
    resource: `condominium:${condominiumId}:member:${targetUserId}`,
    metadata: {
      permissionMode: body.permissionMode,
      actions: body.actions,
    },
    ipAddress: ip,
  });

  if (body.permissionMode === CondominiumPermissionMode.ROLE_DEFAULT) {
    await prisma.$transaction([
      prisma.userCondominium.update({
        where: { id: uc.id },
        data: { permissionMode: CondominiumPermissionMode.ROLE_DEFAULT },
      }),
      prisma.userCondominiumPermission.deleteMany({
        where: { userCondominiumId: uc.id },
      }),
      prisma.auditLog.create({ data: auditData }),
    ]);
  } else {
    const creates: Prisma.UserCondominiumPermissionCreateManyInput[] =
      body.actions.map((action) => ({
        userCondominiumId: uc.id,
        action,
      }));
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.userCondominium.update({
        where: { id: uc.id },
        data: { permissionMode: CondominiumPermissionMode.CUSTOM },
      }),
      prisma.userCondominiumPermission.deleteMany({
        where: { userCondominiumId: uc.id },
      }),
    ];
    if (creates.length > 0) {
      ops.push(
        prisma.userCondominiumPermission.createMany({ data: creates })
      );
    }
    ops.push(prisma.auditLog.create({ data: auditData }));
    await prisma.$transaction(ops);
  }

  const effectivePermissions =
    await getEffectivePermissionsForCondominiumMembership(
      prisma,
      targetUserId,
      condominiumId
    );

  return reply.send({
    userCondominiumId: uc.id,
    permissionMode: body.permissionMode,
    actions: body.actions,
    effectivePermissions,
  });
};
