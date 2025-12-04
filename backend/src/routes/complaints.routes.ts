import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { whatsappService } from "../services/whatsapp.service.js";

const createComplaintSchema = z.object({
  condominiumId: z.string(),
  residentId: z.string(),
  category: z.string(),
  content: z.string(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  isAnonymous: z.boolean().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
  notes: z.string().optional(),
});

const updatePrioritySchema = z.object({
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
});

const addCommentSchema = z.object({
  notes: z.string().min(1, "Comentário não pode ser vazio"),
});

export const complaintsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all complaints from ALL condominiums (SUPER_ADMIN only)
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      if (user.role !== "SUPER_ADMIN") {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Apenas SUPER_ADMIN pode ver todas as ocorrências.",
        });
      }

      const { status, priority, category, condominiumId } = request.query as {
        status?: string;
        priority?: string;
        category?: string;
        condominiumId?: string;
      };

      const complaints = await prisma.complaint.findMany({
        where: {
          ...(condominiumId && { condominiumId }),
          ...(status && { status: status as any }),
          ...(priority && { priority: priority as any }),
          ...(category && { category }),
        },
        include: {
          condominium: {
            select: {
              id: true,
              name: true,
            },
          },
          resident: {
            select: {
              id: true,
              name: true,
              phone: true,
              tower: true,
              floor: true,
              unit: true,
            },
          },
          attachments: true,
          statusHistory: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: [
          { condominium: { name: "asc" } },
          { createdAt: "desc" },
        ],
      });

      return reply.send(complaints);
    }
  );

  // Get all complaints for a condominium
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const { status, priority, category } = request.query as {
        status?: string;
        priority?: string;
        category?: string;
      };

      const complaints = await prisma.complaint.findMany({
        where: {
          condominiumId,
          ...(status && { status: status as any }),
          ...(priority && { priority: priority as any }),
          ...(category && { category }),
        },
        include: {
          resident: {
            select: {
              id: true,
              name: true,
              phone: true,
              tower: true,
              floor: true,
              unit: true,
            },
          },
          attachments: true,
          statusHistory: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reply.send(complaints);
    }
  );

  // Get single complaint
  fastify.get(
    "/detail/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const complaint = await prisma.complaint.findUnique({
        where: { id: parseInt(id) },
        include: {
          resident: true,
          attachments: true,
          statusHistory: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!complaint) {
        return reply.status(404).send({ error: "Complaint not found" });
      }

      return reply.send(complaint);
    }
  );

  // Create complaint
  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = createComplaintSchema.parse(request.body);

      // Get resident info for notification
      const resident = await prisma.resident.findUnique({
        where: { id: body.residentId },
      });

      if (!resident) {
        return reply.status(404).send({ error: "Resident not found" });
      }

      // Create complaint
      const complaint = await prisma.complaint.create({
        data: {
          condominiumId: body.condominiumId,
          residentId: body.residentId,
          category: body.category,
          content: body.content,
          priority: body.priority || "MEDIUM",
          isAnonymous: body.isAnonymous || false,
        },
        include: {
          resident: true,
          attachments: true,
        },
      });

      // Send WhatsApp notification to resident
      if (resident.consentWhatsapp && !body.isAnonymous) {
        try {
          const priorityEmoji = {
            CRITICAL: "🔴",
            HIGH: "🟠",
            MEDIUM: "🟡",
            LOW: "🟢",
          }[complaint.priority];

          let message = `📢 *Denúncia Registrada com Sucesso*\n\n`;
          message += `Olá ${resident.name}!\n\n`;
          message += `Sua denúncia foi recebida e registrada no sistema.\n\n`;
          message += `🆔 Protocolo: *#${complaint.id}*\n`;
          message += `📋 Categoria: ${body.category}\n`;
          message += `${priorityEmoji} Prioridade: ${complaint.priority}\n`;
          message += `📅 Data: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
          message += `Você pode acompanhar o andamento pelo sistema CondoZap.`;

          await whatsappService.sendTextMessage(resident.phone, message);
        } catch (error) {
          fastify.log.error({ error }, "Failed to send WhatsApp notification");
        }
      }

      return reply.status(201).send(complaint);
    }
  );

  // Update complaint status
  fastify.patch(
    "/:id/status",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateStatusSchema.parse(request.body);
      const userId = (request.user as any).id;

      const complaint = await prisma.complaint.findUnique({
        where: { id: parseInt(id) },
        include: { resident: true },
      });

      if (!complaint) {
        return reply.status(404).send({ error: "Complaint not found" });
      }

      // Update complaint status
      const updated = await prisma.complaint.update({
        where: { id: parseInt(id) },
        data: {
          status: body.status,
          ...(body.status === "RESOLVED" && {
            resolvedAt: new Date(),
            resolvedBy: userId,
          }),
        },
        include: {
          resident: true,
          statusHistory: true,
        },
      });

      // Create status history
      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: parseInt(id),
          fromStatus: complaint.status,
          toStatus: body.status,
          changedBy: userId,
          notes: body.notes,
        },
      });

      // Send WhatsApp notification
      if (complaint.resident.consentWhatsapp) {
        try {
          const statusEmoji = {
            OPEN: "🔵",
            IN_PROGRESS: "🟡",
            RESOLVED: "✅",
          }[body.status];

          const statusText = {
            OPEN: "Aberta",
            IN_PROGRESS: "Em Andamento",
            RESOLVED: "Resolvida",
          }[body.status];

          let message = `${statusEmoji} *Atualização da Denúncia #${complaint.id}*\n\n`;
          message += `Olá ${complaint.resident.name}!\n\n`;
          message += `Status alterado para: *${statusText}*\n`;
          message += `Categoria: ${complaint.category}\n`;

          if (body.notes) {
            message += `\n📝 Observação:\n${body.notes}`;
          }

          if (body.status === "RESOLVED") {
            message += `\n\n✅ Sua denúncia foi resolvida! Obrigado por utilizar o CondoZap.`;
          }

          await whatsappService.sendTextMessage(
            complaint.resident.phone,
            message
          );
        } catch (error) {
          fastify.log.error({ error }, "Failed to send WhatsApp notification");
        }
      }

      return reply.send(updated);
    }
  );

  // Update complaint priority
  fastify.patch(
    "/:id/priority",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updatePrioritySchema.parse(request.body);

      const complaint = await prisma.complaint.update({
        where: { id: parseInt(id) },
        data: { priority: body.priority },
        include: { resident: true },
      });

      // Send WhatsApp notification about priority change
      if (complaint.resident.consentWhatsapp) {
        try {
          const priorityText = {
            CRITICAL: "🔴 Crítica",
            HIGH: "🟠 Alta",
            MEDIUM: "🟡 Média",
            LOW: "🟢 Baixa",
          }[body.priority];

          await whatsappService.sendTextMessage(
            complaint.resident.phone,
            `Olá ${complaint.resident.name}! ` +
              `A prioridade da sua denúncia #${complaint.id} foi alterada para: *${priorityText}*`
          );
        } catch (error) {
          fastify.log.error({ error }, "Failed to send WhatsApp notification");
        }
      }

      return reply.send(complaint);
    }
  );

  // Add comment/note to complaint
  fastify.post(
    "/:id/comment",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = addCommentSchema.parse(request.body);
      const userId = (request.user as any).id;
      const user = request.user as any;

      const complaint = await prisma.complaint.findUnique({
        where: { id: parseInt(id) },
        include: { resident: true },
      });

      if (!complaint) {
        return reply.status(404).send({ error: "Complaint not found" });
      }

      // Create status history entry with comment (keeps same status)
      const historyEntry = await prisma.complaintStatusHistory.create({
        data: {
          complaintId: parseInt(id),
          fromStatus: complaint.status,
          toStatus: complaint.status, // Same status, just adding comment
          changedBy: userId,
          notes: body.notes,
        },
      });

      // Update complaint updatedAt timestamp
      await prisma.complaint.update({
        where: { id: parseInt(id) },
        data: { updatedAt: new Date() },
      });

      // Send WhatsApp notification about new comment
      if (complaint.resident.consentWhatsapp) {
        try {
          // Get user role for better message context
          const roleText =
            user.role === "SYNDIC"
              ? "Síndico"
              : user.role === "ADMIN"
              ? "Administrador"
              : "Responsável";

          await whatsappService.sendTextMessage(
            complaint.resident.phone,
            `Olá ${complaint.resident.name}! ` +
              `O ${roleText} adicionou um comentário na sua denúncia #${complaint.id}:\n\n` +
              `"${body.notes}"`
          );
        } catch (error) {
          fastify.log.error({ error }, "Failed to send WhatsApp notification");
        }
      }

      return reply.status(201).send(historyEntry);
    }
  );

  // Delete complaint
  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await prisma.complaint.delete({
        where: { id: parseInt(id) },
      });

      return reply.status(204).send();
    }
  );
};
