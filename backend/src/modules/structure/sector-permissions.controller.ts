import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { SECTOR_ACTIONS } from "../../auth/sector-permissions";

const sectorPermissionsParamsSchema = z.object({
  condominiumId: z.string().min(1),
  sectorId: z.string().min(1),
});

const memberPermissionsParamsSchema = z.object({
  condominiumId: z.string().min(1),
  sectorId: z.string().min(1),
  memberId: z.string().min(1),
});

const updateSectorPermissionsBodySchema = z.object({
  actions: z.array(z.enum(SECTOR_ACTIONS)),
});

const updateMemberOverridesBodySchema = z.object({
  overrides: z.array(
    z.object({
      action: z.enum(SECTOR_ACTIONS),
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
  ]);

  return reply.send({ sectorId, actions });
};

export const updateMemberPermissionOverridesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
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
  ]);

  return reply.send({ memberId, overrides });
};
