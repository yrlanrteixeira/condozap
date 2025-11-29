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

export const complaintsRoutes: FastifyPluginAsync = async (fastify) => {
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
          await whatsappService.sendTextMessage(
            resident.phone,
            `Olá ${resident.name}! Recebemos sua denúncia sobre "${body.category}". ` +
              `Acompanhe o status pelo sistema. Protocolo: #${complaint.id}`
          );
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
          const statusText = {
            OPEN: "Aberta",
            IN_PROGRESS: "Em Andamento",
            RESOLVED: "Resolvida",
          }[body.status];

          await whatsappService.sendTextMessage(
            complaint.resident.phone,
            `Olá ${complaint.resident.name}! ` +
              `Sua denúncia #${complaint.id} foi atualizada para: *${statusText}*. ` +
              (body.notes ? `\nObservação: ${body.notes}` : "")
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

      return reply.send(complaint);
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
