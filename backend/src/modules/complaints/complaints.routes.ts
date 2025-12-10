import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { requireSuperAdmin } from "../../shared/middlewares";
import {
  addComplaintCommentHandler,
  createComplaintHandler,
  deleteComplaintHandler,
  getAllComplaintsHandler,
  getComplaintsByCondominiumHandler,
  updateComplaintPriorityHandler,
  updateComplaintStatusHandler,
} from "./complaints.controller";
import * as complaintService from "./complaints.service";
import { complaintIdParamSchema } from "./complaints.schema";

export const complaintsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    getAllComplaintsHandler
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    getComplaintsByCondominiumHandler
  );

  fastify.get(
    "/detail/:id",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = complaintIdParamSchema.parse(request.params);
      const complaint = await complaintService.getComplaintById(prisma, id);

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
    createComplaintHandler
  );

  fastify.patch(
    "/:id/status",
    {
      onRequest: [fastify.authenticate],
    },
    updateComplaintStatusHandler
  );

  fastify.patch(
    "/:id/priority",
    {
      onRequest: [fastify.authenticate],
    },
    updateComplaintPriorityHandler
  );

  fastify.post(
    "/:id/comment",
    {
      onRequest: [fastify.authenticate],
    },
    addComplaintCommentHandler
  );

  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate],
    },
    deleteComplaintHandler
  );
};
