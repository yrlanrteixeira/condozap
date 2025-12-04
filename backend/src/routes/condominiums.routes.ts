/**
 * Condominiums Routes
 * 
 * Rotas para gerenciar condomínios (SUPER_ADMIN only)
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

// =====================================================
// Schemas
// =====================================================

const createCondominiumSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos'),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

const updateCondominiumSchema = z.object({
  name: z.string().min(3).optional(),
  cnpj: z.string().regex(/^\d{14}$/).optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED']).optional(),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

// =====================================================
// Routes
// =====================================================

export const condominiumsRoutes: FastifyPluginAsync = async (fastify) => {
  
  // =====================================================
  // GET /condominiums
  // List all condominiums (SUPER_ADMIN only)
  // =====================================================
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      // Only SUPER_ADMIN can list all condominiums
      if (user.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ 
          error: 'Forbidden',
          message: 'Apenas SUPER_ADMIN pode listar todos os condomínios.',
        });
      }

      const condominiums = await prisma.condominium.findMany({
        select: {
          id: true,
          name: true,
          cnpj: true,
          status: true,
          whatsappPhone: true,
          whatsappBusinessId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              residents: true,
              users: true,
              complaints: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return reply.send(condominiums);
    }
  );

  // =====================================================
  // GET /condominiums/:id
  // Get single condominium details
  // =====================================================
  fastify.get(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      // Only SUPER_ADMIN can view any condominium
      if (user.role !== 'SUPER_ADMIN') {
        // Check if user has access to this condominium
        const userAccess = await prisma.userCondominium.findFirst({
          where: {
            userId: user.id,
            condominiumId: id,
          },
        });

        if (!userAccess) {
          return reply.status(403).send({ 
            error: 'Forbidden',
            message: 'Você não tem acesso a este condomínio.',
          });
        }
      }

      const condominium = await prisma.condominium.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              residents: true,
              users: true,
              complaints: true,
              messages: true,
            },
          },
        },
      });

      if (!condominium) {
        return reply.status(404).send({ error: 'Condomínio não encontrado' });
      }

      return reply.send(condominium);
    }
  );

  // =====================================================
  // POST /condominiums
  // Create new condominium (SUPER_ADMIN only)
  // =====================================================
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      // Only SUPER_ADMIN can create condominiums
      if (user.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ 
          error: 'Forbidden',
          message: 'Apenas SUPER_ADMIN pode criar condomínios.',
        });
      }

      const body = createCondominiumSchema.parse(request.body);

      // Check if CNPJ already exists
      const existingCondominium = await prisma.condominium.findUnique({
        where: { cnpj: body.cnpj },
      });

      if (existingCondominium) {
        return reply.status(400).send({ 
          error: 'CNPJ já cadastrado',
          message: 'Já existe um condomínio com este CNPJ.',
        });
      }

      const condominium = await prisma.condominium.create({
        data: {
          name: body.name,
          cnpj: body.cnpj,
          status: 'TRIAL',
          whatsappPhone: body.whatsappPhone,
          whatsappBusinessId: body.whatsappBusinessId,
        },
      });

      fastify.log.info(`Condominium ${condominium.id} created by ${user.id}`);

      return reply.status(201).send(condominium);
    }
  );

  // =====================================================
  // PATCH /condominiums/:id
  // Update condominium (SUPER_ADMIN only)
  // =====================================================
  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      // Only SUPER_ADMIN can update condominiums
      if (user.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ 
          error: 'Forbidden',
          message: 'Apenas SUPER_ADMIN pode atualizar condomínios.',
        });
      }

      const body = updateCondominiumSchema.parse(request.body);

      // Check if condominium exists
      const existing = await prisma.condominium.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Condomínio não encontrado' });
      }

      // If updating CNPJ, check if it's already in use
      if (body.cnpj && body.cnpj !== existing.cnpj) {
        const cnpjInUse = await prisma.condominium.findUnique({
          where: { cnpj: body.cnpj },
        });

        if (cnpjInUse) {
          return reply.status(400).send({ 
            error: 'CNPJ já cadastrado',
            message: 'Já existe outro condomínio com este CNPJ.',
          });
        }
      }

      const condominium = await prisma.condominium.update({
        where: { id },
        data: body,
      });

      fastify.log.info(`Condominium ${id} updated by ${user.id}`);

      return reply.send(condominium);
    }
  );

  // =====================================================
  // DELETE /condominiums/:id
  // Delete condominium (SUPER_ADMIN only)
  // =====================================================
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      // Only SUPER_ADMIN can delete condominiums
      if (user.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({ 
          error: 'Forbidden',
          message: 'Apenas SUPER_ADMIN pode deletar condomínios.',
        });
      }

      // Check if condominium exists
      const existing = await prisma.condominium.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              residents: true,
              users: true,
            },
          },
        },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Condomínio não encontrado' });
      }

      // Warn if there are residents or users
      if (existing._count.residents > 0 || existing._count.users > 0) {
        return reply.status(400).send({ 
          error: 'Não é possível excluir',
          message: `Este condomínio possui ${existing._count.residents} moradores e ${existing._count.users} usuários vinculados. Remova-os primeiro.`,
        });
      }

      await prisma.condominium.delete({
        where: { id },
      });

      fastify.log.info(`Condominium ${id} deleted by ${user.id}`);

      return reply.status(204).send();
    }
  );

  // =====================================================
  // GET /condominiums/:id/stats
  // Get condominium statistics
  // =====================================================
  fastify.get(
    '/:id/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as any;

      // Only SUPER_ADMIN can view any condominium stats
      if (user.role !== 'SUPER_ADMIN') {
        const userAccess = await prisma.userCondominium.findFirst({
          where: {
            userId: user.id,
            condominiumId: id,
          },
        });

        if (!userAccess) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const [
        residentsCount,
        complaintsOpen,
        complaintsResolved,
        messagesCount,
      ] = await Promise.all([
        prisma.resident.count({ where: { condominiumId: id } }),
        prisma.complaint.count({ where: { condominiumId: id, status: 'OPEN' } }),
        prisma.complaint.count({ where: { condominiumId: id, status: 'RESOLVED' } }),
        prisma.message.count({ where: { condominiumId: id } }),
      ]);

      return reply.send({
        residents: residentsCount,
        complaints: {
          open: complaintsOpen,
          resolved: complaintsResolved,
          total: complaintsOpen + complaintsResolved,
        },
        messages: messagesCount,
      });
    }
  );
};

