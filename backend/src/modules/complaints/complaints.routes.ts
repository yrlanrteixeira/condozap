import { FastifyPluginAsync } from "fastify";
import { requireSuperAdmin, requireRole } from "../../shared/middlewares";
import {
  requireAttachmentUpload,
  requireCondoAccess,
  requirePauseOrResume,
  requireTicketAssign,
  requireTicketModify,
  requireTicketView,
} from "../../auth/authorize";
import {
  addComplaintCommentHandler,
  addComplaintAttachmentHandler,
  assignComplaintHandler,
  createComplaintHandler,
  deleteComplaintHandler,
  getAllComplaintsHandler,
  getComplaintsByCondominiumHandler,
  getComplaintDetailHandler,
  getComplaintStatsHandler,
  pauseComplaintSlaHandler,
  resumeComplaintSlaHandler,
  runSlaScanHandler,
  updateComplaintHandler,
  updateComplaintPriorityHandler,
  updateComplaintStatusHandler,
} from "./complaints.controller";

export const complaintsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    getAllComplaintsHandler
  );

  fastify.get(
    "/stats",
    {
      onRequest: [fastify.authenticate],
    },
    getComplaintStatsHandler
  );

  fastify.get(
    "/detail/:id",
    {
      onRequest: [fastify.authenticate, requireTicketView()],
    },
    getComplaintDetailHandler
  );

  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess()],
    },
    getComplaintsByCondominiumHandler
  );

  fastify.post(
    "/",
    {
      onRequest: [
        fastify.authenticate,
        requireCondoAccess("condominiumId", "body"),
      ],
    },
    createComplaintHandler
  );

  fastify.put(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireTicketModify()],
    },
    updateComplaintHandler
  );

  fastify.patch(
    "/:id/status",
    {
      onRequest: [fastify.authenticate, requireTicketModify()],
    },
    updateComplaintStatusHandler
  );

  fastify.patch(
    "/:id/priority",
    {
      onRequest: [fastify.authenticate, requireTicketModify()],
    },
    updateComplaintPriorityHandler
  );

  fastify.post(
    "/:id/comment",
    {
      onRequest: [fastify.authenticate, requireTicketModify()],
    },
    addComplaintCommentHandler
  );

  fastify.post(
    "/:id/assign",
    {
      onRequest: [fastify.authenticate, requireTicketAssign()],
    },
    assignComplaintHandler
  );

  fastify.post(
    "/:id/pause",
    {
      onRequest: [fastify.authenticate, requirePauseOrResume()],
    },
    pauseComplaintSlaHandler
  );

  fastify.post(
    "/:id/resume",
    {
      onRequest: [fastify.authenticate, requirePauseOrResume()],
    },
    resumeComplaintSlaHandler
  );

  fastify.post(
    "/:id/attachments",
    {
      onRequest: [fastify.authenticate, requireAttachmentUpload()],
    },
    addComplaintAttachmentHandler
  );

  fastify.post(
    "/sla/scan",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"]),
      ],
    },
    runSlaScanHandler
  );

  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireTicketModify()],
    },
    deleteComplaintHandler
  );
};
