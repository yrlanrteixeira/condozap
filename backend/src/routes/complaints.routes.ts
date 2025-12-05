import { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireSuperAdmin } from "../middlewares/index.js";
import * as complaintService from "../services/complaints.service.js";
import {
  validateCreateComplaint,
  validateUpdateStatus,
  validateUpdatePriority,
  validateAddComment,
} from "../schemas/complaints.js";
import type {
  CreateComplaintRequest,
  UpdateComplaintStatusRequest,
  UpdateComplaintPriorityRequest,
  AddComplaintCommentRequest,
  ComplaintFilters,
} from "../types/requests.js";

export const complaintsRoutes: FastifyPluginAsync = async (fastify) => {
  // =====================================================
  // GET /complaints/all
  // Get all complaints (SUPER_ADMIN only)
  // =====================================================
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request, reply) => {
      const filters = request.query as ComplaintFilters;

      const complaints = await complaintService.getAllComplaints(prisma, filters);

      return reply.send(complaints);
    }
  );

  // =====================================================
  // GET /complaints/:condominiumId
  // Get complaints by condominium
  // =====================================================
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const filters = request.query as Omit<ComplaintFilters, "condominiumId">;

      const complaints = await complaintService.getComplaintsByCondominium(
        prisma,
        condominiumId,
        filters
      );

      return reply.send(complaints);
    }
  );

  // =====================================================
  // GET /complaints/detail/:id
  // Get single complaint
  // =====================================================
  fastify.get(
    "/detail/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const complaint = await complaintService.getComplaintById(prisma, parseInt(id));

      if (!complaint) {
        return reply.status(404).send({ error: "Complaint not found" });
      }

      return reply.send(complaint);
    }
  );

  // =====================================================
  // POST /complaints
  // Create complaint
  // =====================================================
  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = request.body as CreateComplaintRequest;

      // Validate
      const validationError = validateCreateComplaint(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      try {
        const complaint = await complaintService.createComplaint(
          prisma,
          fastify.log,
          body
        );
        return reply.status(201).send(complaint);
      } catch (error: any) {
        const status = error.message.includes("not found") ? 404 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // PATCH /complaints/:id/status
  // Update complaint status
  // =====================================================
  fastify.patch(
    "/:id/status",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateComplaintStatusRequest;
      const userId = (request.user as any).id;

      // Validate
      const validationError = validateUpdateStatus(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      try {
        const updated = await complaintService.updateComplaintStatus(
          prisma,
          fastify.log,
          parseInt(id),
          body,
          userId
        );
        return reply.send(updated);
      } catch (error: any) {
        const status = error.message.includes("not found") ? 404 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // PATCH /complaints/:id/priority
  // Update complaint priority
  // =====================================================
  fastify.patch(
    "/:id/priority",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateComplaintPriorityRequest;

      // Validate
      const validationError = validateUpdatePriority(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      try {
        const complaint = await complaintService.updateComplaintPriority(
          prisma,
          fastify.log,
          parseInt(id),
          body
        );
        return reply.send(complaint);
      } catch (error: any) {
        return reply.status(400).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // POST /complaints/:id/comment
  // Add comment to complaint
  // =====================================================
  fastify.post(
    "/:id/comment",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as AddComplaintCommentRequest;
      const userId = (request.user as any).id;
      const userRole = (request.user as any).role;

      // Validate
      const validationError = validateAddComment(body);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      try {
        const historyEntry = await complaintService.addComplaintComment(
          prisma,
          fastify.log,
          parseInt(id),
          body,
          userId,
          userRole
        );
        return reply.status(201).send(historyEntry);
      } catch (error: any) {
        const status = error.message.includes("not found") ? 404 : 400;
        return reply.status(status).send({ error: error.message });
      }
    }
  );

  // =====================================================
  // DELETE /complaints/:id
  // Delete complaint
  // =====================================================
  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await complaintService.deleteComplaint(prisma, fastify.log, parseInt(id));

      return reply.status(204).send();
    }
  );
};
