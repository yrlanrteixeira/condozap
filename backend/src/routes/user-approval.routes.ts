/**
 * User Approval Routes
 * 
 * Rotas para gerenciar aprovação de novos usuários
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

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
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;
      const body = approvUserSchema.parse(request.body);

      // Only admins and syndics can approve users
      if (!['SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC'].includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden' });
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

          if (existingResident) {
            // Update existing resident with user link
            await tx.resident.update({
              where: { id: existingResident.id },
              data: {
                userId: body.userId,
                name: approvedUser.name,
                type: body.type,
              },
            });
          } else {
            // Create new resident
            await tx.resident.create({
              data: {
                condominiumId: body.condominiumId,
                userId: body.userId,
                name: approvedUser.name,
                phone: '', // TODO: Get from user profile or request
                tower: body.tower,
                floor: body.floor,
                unit: body.unit,
                type: body.type,
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
        fastify.log.error('Failed to approve user:', error as Error);
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
        fastify.log.error('Failed to reject user:', error as Error);
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


