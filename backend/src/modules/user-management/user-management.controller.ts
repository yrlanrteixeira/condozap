import { FastifyReply, FastifyRequest } from "fastify";
import {
  createAdminSchema,
  createSyndicSchema,
  updateUserRoleSchema,
  removeUserSchema,
  inviteUserSchema,
  type CreateAdminRequest,
  type CreateSyndicRequest,
  type UpdateUserRoleRequest,
  type RemoveUserRequest,
  type InviteUserRequest,
} from "./user-management.schema";
import * as userService from "./users.service";
import { prisma } from "../../shared/db/prisma";
import type { AuthUser } from "../../types/auth";

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

  await userService.updateUserRole(
    prisma,
    request.log,
    body,
    currentUser.id
  );

  return reply.send({
    message: "Função atualizada com sucesso",
    newRole: body.newRole,
  });
}

export async function removeUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const currentUser = request.user as AuthUser;
  const body = removeUserSchema.parse(request.body) as RemoveUserRequest;

  const { userSuspended } = await userService.removeUserFromCondominium(
    prisma,
    request.log,
    body,
    currentUser.id
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
  const body = inviteUserSchema.parse(request.body) as InviteUserRequest;

  const invited = await userService.inviteUserToCondominium(
    prisma,
    request.log,
    body
  );

  return reply.send({
    message: "Usuário vinculado ao condomínio",
    user: invited,
  });
}

