/**
 * User Management Routes
 *
 * Rotas para síndicos/admins gerenciarem usuários do condomínio
 */

import { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import {
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireCondoAccess,
} from "../middlewares/index.js";
import { AuthUser } from "../types/auth.js";
import * as userService from "../services/users.service.js";
import {
  validateCreateAdmin,
  validateCreateSyndic,
  validateUpdateUserRole,
  validateRemoveUser,
  validateInviteUser,
} from "../schemas/users.js";
import type {
  CreateAdminRequest,
  CreateSyndicRequest,
  UpdateUserRoleRequest,
  RemoveUserRequest,
  InviteUserRequest,
} from "../types/requests.js";

export const userManagementRoutes: FastifyPluginAsync = async (fastify) => {
  // =====================================================
  // POST /users/create-admin
  // Síndico cria um admin (pessoa de confiança)
  // =====================================================
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
      const body = request.body as CreateAdminRequest;

      // Validate
      const validationError = validateCreateAdmin(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

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

  // =====================================================
  // POST /users/create-syndic
  // SUPER_ADMIN cria um síndico e vincula a múltiplos condomínios
  // =====================================================
  fastify.post(
    "/users/create-syndic",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const currentUser = request.user as AuthUser;
      const body = request.body as CreateSyndicRequest;

      // Validate
      const validationError = validateCreateSyndic(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

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

  // =====================================================
  // GET /users/condominium/:condominiumId
  // Lista todos os usuários de um condomínio
  // =====================================================
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

  // =====================================================
  // PATCH /users/update-role
  // Atualiza o role de um usuário no condomínio
  // =====================================================
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
      const body = request.body as UpdateUserRoleRequest;

      // Validate
      const validationError = validateUpdateUserRole(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

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

  // =====================================================
  // DELETE /users/remove
  // Remove um usuário do condomínio
  // =====================================================
  fastify.delete(
    "/users/remove",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    async (request, reply) => {
      const currentUser = request.user as AuthUser;
      const body = request.body as RemoveUserRequest;

      // Validate
      const validationError = validateRemoveUser(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

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

  // =====================================================
  // POST /users/invite
  // Convida um usuário existente para o condomínio
  // =====================================================
  fastify.post(
    "/users/invite",
    {
      onRequest: [fastify.authenticate, requireAdmin()],
    },
    async (request, reply) => {
      const body = request.body as InviteUserRequest;

      // Validate
      const validationError = validateInviteUser(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

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
