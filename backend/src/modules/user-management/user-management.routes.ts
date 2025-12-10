import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma";
import {
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireCondoAccess,
} from "../../middlewares";
import { AuthUser } from "../../types/auth";
import * as userService from "./users.service";
import {
  createAdminSchema,
  createSyndicSchema,
  updateUserRoleSchema,
  removeUserSchema,
  inviteUserSchema,
} from "./user-management.schemas";
import type {
  CreateAdminRequest,
  CreateSyndicRequest,
  UpdateUserRoleRequest,
  RemoveUserRequest,
  InviteUserRequest,
} from "./user-management.types";

export const userManagementRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/users/create-admin",
    {
      onRequest: [
        fastify.authenticate,
        requireAdmin(),
        requireCondoAccess({ source: "body" }),
      ],
    },
    async (request, reply) => {
      const currentUser = request.user as AuthUser;
      const body = createAdminSchema.parse(request.body) as CreateAdminRequest;

      try {
        const newAdmin = await userService.createAdmin(
          prisma,
          fastify.log,
          body,
          currentUser.id
        );

        return reply.status(201).send({
          message: "Administrador criado com sucesso",
          user: newAdmin,
        });
      } catch (error: any) {
        const status = error.message.includes("já está cadastrado") ? 400 : 500;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  fastify.post(
    "/users/create-syndic",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const currentUser = request.user as AuthUser;
      const body = createSyndicSchema.parse(
        request.body
      ) as CreateSyndicRequest;

      try {
        const result = await userService.createSyndic(
          prisma,
          fastify.log,
          body,
          currentUser.id
        );

        return reply.status(201).send({
          message: "Síndico criado com sucesso",
          user: result.user,
          condominiumsCount: result.condominiumsCount,
        });
      } catch (error: any) {
        const status = error.message.includes("já está cadastrado") ? 400 : 500;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  fastify.get(
    "/users/condominium/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };

      const users = await userService.getUsersByCondominium(prisma, condominiumId);

      return reply.send(users);
    }
  );

  fastify.patch(
    "/users/update-role",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "SYNDIC"]),
      ],
    },
    async (request, reply) => {
      const currentUser = request.user as AuthUser;
      const body = updateUserRoleSchema.parse(
        request.body
      ) as UpdateUserRoleRequest;

      try {
        await userService.updateUserRole(
          prisma,
          fastify.log,
          body,
          currentUser.id
        );

        return reply.send({
          message: "Função atualizada com sucesso",
          newRole: body.newRole,
        });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.delete(
    "/users/remove",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    async (request, reply) => {
      const currentUser = request.user as AuthUser;
      const body = removeUserSchema.parse(request.body) as RemoveUserRequest;

      try {
        const result = await userService.removeUserFromCondominium(
          prisma,
          fastify.log,
          body,
          currentUser.id
        );

        return reply.send({
          message: "Usuário removido do condomínio",
          userSuspended: result.userSuspended,
        });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.post(
    "/users/invite",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    async (request, reply) => {
      const body = inviteUserSchema.parse(request.body) as InviteUserRequest;

      try {
        const user = await userService.inviteUserToCondominium(
          prisma,
          fastify.log,
          body
        );

        return reply.send({
          message: "Usuário adicionado ao condomínio",
          user,
        });
      } catch (error: any) {
        const status = error.message.includes("não encontrado") ? 404 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );
};


