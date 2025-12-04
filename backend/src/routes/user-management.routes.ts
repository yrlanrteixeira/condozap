/**
 * User Management Routes
 *
 * Rotas para síndicos/admins gerenciarem usuários do condomínio
 * - Criar admins (pessoas de confiança)
 * - Listar usuários do condomínio
 * - Atualizar/remover usuários
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

// =====================================================
// Schemas
// =====================================================

const createAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(8),
  condominiumId: z.string(),
});

const updateUserRoleSchema = z.object({
  userId: z.string(),
  newRole: z.enum(["ADMIN", "SYNDIC", "RESIDENT"]),
});

const removeUserSchema = z.object({
  userId: z.string(),
  condominiumId: z.string(),
});

// =====================================================
// Routes
// =====================================================

export const userManagementRoutes: FastifyPluginAsync = async (fastify) => {
  // =====================================================
  // POST /users/create-admin
  // Síndico cria um admin (pessoa de confiança)
  // =====================================================
  fastify.post(
    "/users/create-admin",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const currentUser = request.user as any;
      const body = createAdminSchema.parse(request.body);

      // Verificar se o usuário atual pode criar admins
      // Apenas SUPER_ADMIN, PROFESSIONAL_SYNDIC, ADMIN e SYNDIC podem
      if (
        !["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"].includes(
          currentUser.role
        )
      ) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Você não tem permissão para criar administradores.",
        });
      }

      // Verificar se o usuário atual tem acesso ao condomínio
      const userCondominium = await prisma.userCondominium.findFirst({
        where: {
          userId: currentUser.id,
          condominiumId: body.condominiumId,
        },
      });

      if (!userCondominium && currentUser.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Você não tem acesso a este condomínio.",
        });
      }

      // Verificar se o email já está em uso
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        return reply.status(400).send({
          error: "Email already in use",
          message: "Este email já está cadastrado no sistema.",
        });
      }

      try {
        // Hash da senha
        const hashedPassword = await bcrypt.hash(body.password, 10);

        // Criar usuário já aprovado
        const newAdmin = await prisma.user.create({
          data: {
            email: body.email,
            password: hashedPassword,
            name: body.name,
            role: "ADMIN",
            permissionScope: "LOCAL",
            status: "APPROVED",
            approvedAt: new Date(),
            approvedBy: currentUser.id,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            createdAt: true,
          },
        });

        // Vincular ao condomínio
        await prisma.userCondominium.create({
          data: {
            userId: newAdmin.id,
            condominiumId: body.condominiumId,
            role: "ADMIN",
          },
        });

        fastify.log.info(
          `Admin ${newAdmin.email} created by ${currentUser.email} for condominium ${body.condominiumId}`
        );

        return reply.status(201).send({
          message: "Administrador criado com sucesso",
          user: newAdmin,
        });
      } catch (error: any) {
        fastify.log.error("Failed to create admin:", error);
        return reply.status(500).send({
          error: "Failed to create admin",
          message: error.message,
        });
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
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const currentUser = request.user as any;
      const { condominiumId } = request.params as { condominiumId: string };

      // Verificar permissão
      if (
        !["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"].includes(
          currentUser.role
        )
      ) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      // Buscar usuários do condomínio
      const users = await prisma.userCondominium.findMany({
        where: { condominiumId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              createdAt: true,
              approvedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formattedUsers = users.map((uc) => ({
        id: uc.user.id,
        email: uc.user.email,
        name: uc.user.name,
        role: uc.role,
        globalRole: uc.user.role,
        status: uc.user.status,
        createdAt: uc.user.createdAt,
        approvedAt: uc.user.approvedAt,
      }));

      return reply.send(formattedUsers);
    }
  );

  // =====================================================
  // PATCH /users/update-role
  // Atualiza o role de um usuário no condomínio
  // =====================================================
  fastify.patch(
    "/users/update-role",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const currentUser = request.user as any;
      const body = updateUserRoleSchema.parse(request.body);

      // Apenas SUPER_ADMIN, PROFESSIONAL_SYNDIC e SYNDIC podem alterar roles
      if (
        !["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "SYNDIC"].includes(
          currentUser.role
        )
      ) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Você não tem permissão para alterar funções de usuários.",
        });
      }

      // Não pode alterar próprio role
      if (body.userId === currentUser.id) {
        return reply.status(400).send({
          error: "Invalid operation",
          message: "Você não pode alterar sua própria função.",
        });
      }

      try {
        // Atualizar role no User
        await prisma.user.update({
          where: { id: body.userId },
          data: { role: body.newRole },
        });

        // Atualizar role em todos os UserCondominium
        await prisma.userCondominium.updateMany({
          where: { userId: body.userId },
          data: { role: body.newRole },
        });

        return reply.send({
          message: "Função atualizada com sucesso",
          newRole: body.newRole,
        });
      } catch (error: any) {
        fastify.log.error("Failed to update role:", error);
        return reply.status(500).send({ error: "Failed to update role" });
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
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const currentUser = request.user as any;
      const body = removeUserSchema.parse(request.body);

      // Verificar permissão
      if (
        !["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"].includes(
          currentUser.role
        )
      ) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      // Não pode remover a si mesmo
      if (body.userId === currentUser.id) {
        return reply.status(400).send({
          error: "Invalid operation",
          message: "Você não pode remover a si mesmo.",
        });
      }

      try {
        // Remover vínculo com o condomínio
        await prisma.userCondominium.deleteMany({
          where: {
            userId: body.userId,
            condominiumId: body.condominiumId,
          },
        });

        // Verificar se o usuário ainda tem outros condomínios
        const remainingCondos = await prisma.userCondominium.count({
          where: { userId: body.userId },
        });

        // Se não tem mais condomínios, suspender o usuário
        if (remainingCondos === 0) {
          await prisma.user.update({
            where: { id: body.userId },
            data: { status: "SUSPENDED" },
          });
        }

        return reply.send({
          message: "Usuário removido do condomínio",
          userSuspended: remainingCondos === 0,
        });
      } catch (error: any) {
        fastify.log.error("Failed to remove user:", error);
        return reply.status(500).send({ error: "Failed to remove user" });
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
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const currentUser = request.user as any;
      const body = z
        .object({
          email: z.string().email(),
          condominiumId: z.string(),
          role: z.enum(["ADMIN", "SYNDIC", "RESIDENT"]).default("ADMIN"),
        })
        .parse(request.body);

      // Verificar permissão
      if (
        !["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"].includes(
          currentUser.role
        )
      ) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      // Buscar usuário pelo email
      const targetUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!targetUser) {
        return reply.status(404).send({
          error: "User not found",
          message: "Usuário não encontrado. Crie um novo administrador.",
        });
      }

      // Verificar se já está no condomínio
      const existingLink = await prisma.userCondominium.findFirst({
        where: {
          userId: targetUser.id,
          condominiumId: body.condominiumId,
        },
      });

      if (existingLink) {
        return reply.status(400).send({
          error: "Already linked",
          message: "Este usuário já está vinculado ao condomínio.",
        });
      }

      // Vincular ao condomínio
      await prisma.userCondominium.create({
        data: {
          userId: targetUser.id,
          condominiumId: body.condominiumId,
          role: body.role,
        },
      });

      return reply.send({
        message: "Usuário adicionado ao condomínio",
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: body.role,
        },
      });
    }
  );
};
