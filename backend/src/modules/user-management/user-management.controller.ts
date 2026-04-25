import { FastifyReply, FastifyRequest } from "fastify";
import {
  createAdminSchema,
  createSyndicSchema,
  createProfessionalSyndicSchema,
  updateSyndicSchema,
  updateUserRoleSchema,
  updateCouncilPositionSchema,
  removeUserSchema,
  inviteUserSchema,
  type CreateAdminRequest,
  type CreateSyndicRequest,
  type CreateProfessionalSyndicRequest,
  type UpdateSyndicRequest,
  type UpdateUserRoleRequest,
  type UpdateCouncilPositionRequest,
  type RemoveUserRequest,
  type InviteUserRequest,
} from "./user-management.schema";
import * as userService from "./users.service";
import { prisma } from "../../shared/db/prisma";
import type { AuthUser } from "../../types/auth";
import { resolveAccessContext } from "../../auth/context";

async function buildCaller(user: AuthUser): Promise<userService.CallerContext> {
  const ctx = await resolveAccessContext(prisma, {
    id: user.id,
    role: user.role as any,
    permissionScope: user.permissionScope as any,
  });
  return {
    id: user.id,
    role: user.role as string,
    allowedCondominiumIds: ctx.allowedCondominiumIds,
  };
}

export async function createAdminHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const currentUser = request.user as AuthUser;
  const body = createAdminSchema.parse(request.body) as CreateAdminRequest;

  const newAdmin = await userService.createAdmin(
    prisma,
    request.log,
    body,
    currentUser.id
  );

  return reply.status(201).send({
    message: "Administrador criado com sucesso",
    user: newAdmin,
  });
}

export async function createSyndicHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const currentUser = request.user as AuthUser;
  const body = createSyndicSchema.parse(request.body) as CreateSyndicRequest;

  const result = await userService.createSyndic(
    prisma,
    request.log,
    body,
    currentUser.id
  );

  return reply.status(201).send({
    message: "Síndico criado com sucesso",
    user: result.user,
    condominiumsCount: result.condominiumsCount,
  });
}

export async function createProfessionalSyndicHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const currentUser = request.user as AuthUser;
  const body = createProfessionalSyndicSchema.parse(
    request.body
  ) as CreateProfessionalSyndicRequest;

  const result = await userService.createProfessionalSyndic(
    prisma,
    request.log,
    body,
    currentUser.id
  );

  return reply.status(201).send({
    message: "Síndico Profissional criado com sucesso",
    user: result.user,
    condominiumsCount: result.condominiumsCount,
  });
}

export async function listUsersByCondoHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = request.params as { condominiumId: string };

  const users = await userService.getUsersByCondominium(prisma, condominiumId);
  return reply.send(users);
}

export async function updateUserRoleHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const currentUser = request.user as AuthUser;
  const body = updateUserRoleSchema.parse(
    request.body
  ) as UpdateUserRoleRequest;

  const caller = await buildCaller(currentUser);
  await userService.updateUserRole(
    prisma,
    request.log,
    body,
    caller
  );

  return reply.send({
    message: "Função atualizada com sucesso",
    newRole: body.newRole,
  });
}

export async function updateCouncilPositionHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = updateCouncilPositionSchema.parse(
    request.body
  ) as UpdateCouncilPositionRequest;

  const result = await userService.updateCouncilPosition(
    prisma,
    request.log,
    body
  );

  return reply.send({
    message: "Cargo/função atualizado com sucesso",
    councilPosition: result.councilPosition,
  });
}

export async function removeUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const currentUser = request.user as AuthUser;
  const body = removeUserSchema.parse(request.body) as RemoveUserRequest;

  const caller = await buildCaller(currentUser);
  const { userSuspended } = await userService.removeUserFromCondominium(
    prisma,
    request.log,
    body,
    caller
  );

  return reply.send({
    message: "Usuário removido do condomínio",
    userSuspended,
  });
}

export async function inviteUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const currentUser = request.user as AuthUser;
  const body = inviteUserSchema.parse(request.body) as InviteUserRequest;

  const caller = await buildCaller(currentUser);
  const invited = await userService.inviteUserToCondominium(
    prisma,
    request.log,
    body,
    caller
  );

  return reply.send({
    message: "Usuário vinculado ao condomínio",
    user: invited,
  });
}

export async function listSyndicsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const syndics = await prisma.user.findMany({
    where: { role: { in: ["SYNDIC", "PROFESSIONAL_SYNDIC"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      condominiums: {
        select: {
          id: true,
          condominiumId: true,
          condominium: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return reply.send(syndics);
}

export async function updateSyndicHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const currentUser = request.user as AuthUser;
  const { userId } = request.params as { userId: string };
  const body = updateSyndicSchema.parse(request.body) as UpdateSyndicRequest;

  await userService.updateSyndic(
    prisma,
    request.log,
    userId,
    body,
    currentUser.id
  );

  return reply.send({
    message: "Síndico atualizado com sucesso",
  });
}

