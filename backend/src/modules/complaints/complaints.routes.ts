import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { requireSuperAdmin } from "../../middlewares/index.js";
import * as complaintService from "./complaints.service.js";
import {
  addCommentSchema,
  createComplaintSchema,
  updatePrioritySchema,
  updateStatusSchema,
} from "./complaints.schemas.js";
import type {
  AddComplaintCommentRequest,
  ComplaintFilters,
  CreateComplaintRequest,
  UpdateComplaintPriorityRequest,
  UpdateComplaintStatusRequest,
} from "./complaints.types.js";

export const complaintsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (request) => {
      const filters = request.query as ComplaintFilters;
      return complaintService.getAllComplaints(prisma, filters);
    }
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const filters = request.query as Omit<ComplaintFilters, "condominiumId">;

      return complaintService.getComplaintsByCondominium(
        prisma,
        condominiumId,
        filters
      );
    }
  );

  fastify.get(
    "/detail/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const complaint = await complaintService.getComplaintById(
        prisma,
        parseInt(id)
      );

      if (!complaint) {
        return reply.status(404).send({ error: "Complaint not found" });
      }

      return reply.send(complaint);
    }
  );

  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const body = createComplaintSchema.parse(
        request.body
      ) as CreateComplaintRequest;

      const complaint = await complaintService.createComplaint(
        prisma,
        fastify.log,
        body
      );
      return reply.status(201).send(complaint);
    }
  );

  fastify.patch(
    "/:id/status",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateStatusSchema.parse(
        request.body
      ) as UpdateComplaintStatusRequest;
      const userId = (request.user as any).id;

      const updated = await complaintService.updateComplaintStatus(
        prisma,
        fastify.log,
        parseInt(id),
        body,
        userId
      );
      return reply.send(updated);
    }
  );

  fastify.patch(
    "/:id/priority",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updatePrioritySchema.parse(
        request.body
      ) as UpdateComplaintPriorityRequest;

      const complaint = await complaintService.updateComplaintPriority(
        prisma,
        fastify.log,
        parseInt(id),
        body
      );
      return reply.send(complaint);
    }
  );

  fastify.post(
    "/:id/comment",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = addCommentSchema.parse(
        request.body
      ) as AddComplaintCommentRequest;
      const userId = (request.user as any).id;
      const userRole = (request.user as any).role;

      const historyEntry = await complaintService.addComplaintComment(
        prisma,
        fastify.log,
        parseInt(id),
        body,
        userId,
        userRole
      );
      return reply.status(201).send(historyEntry);
    }
  );

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
