/**
 * User Approval Routes
 * 
 * Rotas para gerenciar aprovação de novos usuários
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireSuperAdmin, requireAdmin, requireCondoAccess } from '../middlewares/index.js';
import { AuthUser } from '../types/auth.js';

// =====================================================
// Schemas
// =====================================================

const approvUserSchema = z.object({
  userId: z.string(),
  condominiumId: z.string(),
  tower: z.string(),
  floor: z.string(),
  unit: z.string(),
  type: z.enum(['OWNER', 'TENANT']).optional().default('OWNER'),
});

const rejectUserSchema = z.object({
  userId: z.string(),
  reason: z.string(),
});

// =====================================================
// Routes
// =====================================================

export const userApprovalRoutes: FastifyPluginAsync = async (fastify) => {
  
  // =====================================================
  // GET /condominiums/list
  // List all condominiums (for SUPER_ADMIN approval dropdown)
  // =====================================================
  fastify.get(
    '/condominiums/list',
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (_request, reply) => {
      const condominiums = await prisma.condominium.findMany({
        select: {
          id: true,
          name: true,
          status: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return reply.send(condominiums);
    }
  );

  // =====================================================
  // GET /users/pending/all
  // List ALL pending users (SUPER_ADMIN only)
  // =====================================================
  fastify.get(
    '/users/pending/all',
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (_request, reply) => {
      const pendingUsers = await prisma.user.findMany({
        where: {
          status: 'PENDING',
        },
        select: {
          id: true,
          name: true,
          email: true,
          requestedCondominiumId: true,
          requestedTower: true,
          requestedFloor: true,
          requestedUnit: true,
          requestedPhone: true,
          consentWhatsapp: true,
          consentDataProcessing: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(pendingUsers);
    }
  );

  // =====================================================
  // GET /users/pending/:condominiumId
  // List pending users for a condominium
  // =====================================================
  fastify.get(
    '/users/pending/:condominiumId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const user = request.user as any;

      // Only admins and syndics can view pending users
      if (!['SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC'].includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Verify user has access to this condominium (except SUPER_ADMIN)
      if (user.role !== 'SUPER_ADMIN') {
        const userAccess = await prisma.userCondominium.findFirst({
          where: {
            userId: user.id,
            condominiumId: condominiumId,
          },
        });

        if (!userAccess) {
          return reply.status(403).send({ 
            error: 'Forbidden',
            message: 'Você não tem acesso a este condomínio.',
          });
        }
      }

      const pendingUsers = await prisma.user.findMany({
        where: {
          status: 'PENDING',
          requestedCondominiumId: condominiumId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          requestedTower: true,
          requestedFloor: true,
          requestedUnit: true,
          requestedPhone: true,
          consentWhatsapp: true,
          consentDataProcessing: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(pendingUsers);
    }
  );

  // =====================================================
  // POST /users/approve
  // Approve a pending user and allocate to unit
  // =====================================================
  fastify.post(
    '/users/approve',
    {
      onRequest: [
        fastify.authenticate,
        requireAdmin(),
        requireCondoAccess({ source: 'body' }),
      ],
    },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const body = approvUserSchema.parse(request.body);

      // Verify the pending user exists and is pending
      const pendingUser = await prisma.user.findFirst({
        where: {
          id: body.userId,
          status: 'PENDING',
        },
      });

      if (!pendingUser) {
        return reply.status(400).send({ 
          error: 'Invalid request',
          message: 'Usuário não encontrado ou não está pendente.',
        });
      }

      // Verify the condominium exists
      const condominium = await prisma.condominium.findUnique({
        where: { id: body.condominiumId },
      });

      if (!condominium) {
        return reply.status(400).send({ 
          error: 'Invalid request',
          message: 'Condomínio não encontrado. Verifique o ID informado.',
        });
      }

      try {
        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
          // 1. Update user status
          const approvedUser = await tx.user.update({
            where: { id: body.userId },
            data: {
              status: 'APPROVED',
              approvedAt: new Date(),
              approvedBy: user.id,
            },
          });

          // 2. Create or update resident entry
          const existingResident = await tx.resident.findFirst({
            where: {
              condominiumId: body.condominiumId,
              tower: body.tower,
              floor: body.floor,
              unit: body.unit,
            },
          });

          // Ensure phone is in valid format
          const phone = pendingUser.requestedPhone || '5500000000000'; // Default if not provided

          if (existingResident) {
            // Update existing resident with user link and consent
            await tx.resident.update({
              where: { id: existingResident.id },
              data: {
                userId: body.userId,
                name: approvedUser.name,
                email: approvedUser.email,
                phone: pendingUser.requestedPhone || existingResident.phone,
                type: body.type,
                consentWhatsapp: pendingUser.consentWhatsapp,
                consentDataProcessing: pendingUser.consentDataProcessing,
              },
            });
          } else {
            // Create new resident with data from pending user
            await tx.resident.create({
              data: {
                condominiumId: body.condominiumId,
                userId: body.userId,
                name: approvedUser.name,
                email: approvedUser.email,
                phone: phone,
                tower: body.tower,
                floor: body.floor,
                unit: body.unit,
                type: body.type,
                consentWhatsapp: pendingUser.consentWhatsapp,
                consentDataProcessing: pendingUser.consentDataProcessing,
              },
            });
          }

          // 3. Add user to condominium (if not already)
          const existingUserCondominium = await tx.userCondominium.findUnique({
            where: {
              userId_condominiumId: {
                userId: body.userId,
                condominiumId: body.condominiumId,
              },
            },
          });

          if (!existingUserCondominium) {
            await tx.userCondominium.create({
              data: {
                userId: body.userId,
                condominiumId: body.condominiumId,
                role: 'RESIDENT',
              },
            });
          }

          return approvedUser;
        });

        fastify.log.info(`User ${result.id} approved by ${user.id}`);

        return reply.send({
          message: 'User approved successfully',
          user: result,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to approve user');
        return reply.status(500).send({ error: 'Failed to approve user' });
      }
    }
  );

  // =====================================================
  // POST /users/reject
  // Reject a pending user
  // =====================================================
  fastify.post(
    '/users/reject',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;
      const body = rejectUserSchema.parse(request.body);

      // Only admins and syndics can reject users
      if (!['SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC'].includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Get pending user to check condominium access
      const pendingUser = await prisma.user.findFirst({
        where: {
          id: body.userId,
          status: 'PENDING',
        },
      });

      if (!pendingUser) {
        return reply.status(400).send({ 
          error: 'Invalid request',
          message: 'Usuário não encontrado ou não está pendente.',
        });
      }

      // Verify user has access to the condominium (except SUPER_ADMIN)
      if (user.role !== 'SUPER_ADMIN' && pendingUser.requestedCondominiumId) {
        const userAccess = await prisma.userCondominium.findFirst({
          where: {
            userId: user.id,
            condominiumId: pendingUser.requestedCondominiumId,
          },
        });

        if (!userAccess) {
          return reply.status(403).send({ 
            error: 'Forbidden',
            message: 'Você não tem permissão para rejeitar usuários deste condomínio.',
          });
        }
      }

      try {
        const rejectedUser = await prisma.user.update({
          where: { id: body.userId },
          data: {
            status: 'REJECTED',
            rejectionReason: body.reason,
            approvedBy: user.id, // Who rejected
          },
        });

        fastify.log.info(`User ${rejectedUser.id} rejected by ${user.id}`);

        return reply.send({
          message: 'User rejected',
          user: rejectedUser,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to reject user');
        return reply.status(500).send({ error: 'Failed to reject user' });
      }
    }
  );

  // =====================================================
  // GET /users/my-status
  // Get current user's approval status
  // =====================================================
  fastify.get(
    '/users/my-status',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      const userStatus = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          approvedAt: true,
          rejectionReason: true,
          requestedTower: true,
          requestedFloor: true,
          requestedUnit: true,
        },
      });

      return reply.send(userStatus);
    }
  );
};


