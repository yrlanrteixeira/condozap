import { FastifyPluginAsync } from "fastify";
import { requireRole, requireSyndicStrict, requireGlobalScope, requireComplaintOwner } from "../../shared/middlewares";
import {
  requireAttachmentUpload,
  requireComplaintOwnerAction,
  requireCondoAccess,
  requireCondoPermissionAny,
  requireCondoPermissionFromComplaint,
  requirePauseOrResume,
  requireTicketAssign,
  requireTicketModify,
  requireTicketView,
} from "../../auth/authorize";
import { requireSectorComplaintPermission } from "../../auth/sector-permissions";
import { nudgeComplaintHandler } from "./complaints-nudge.controller";
import { returnComplaintHandler } from "./complaints-return.controller";
import { complementComplaintHandler } from "./complaints-complement.controller";
import { reopenComplaintHandler } from "./complaints-reopen.controller";
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
  submitCsatHandler,
  updateComplaintHandler,
  updateComplaintPriorityHandler,
  updateComplaintStatusHandler,
} from "./complaints.controller";

export const complaintsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/all",
    {
      onRequest: [fastify.authenticate, requireRole(["PROFESSIONAL_SYNDIC"]), requireGlobalScope()],
    },
    getAllComplaintsHandler
  );

  fastify.get(
    "/stats",
    {
      onRequest: [fastify.authenticate, requireCondoAccess({ source: "query" })],
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
      onRequest: [
        fastify.authenticate,
        requireCondoAccess(),
        requireCondoPermissionAny([
          "view:complaints",
          "view:own_complaints",
        ]),
      ],
    },
    getComplaintsByCondominiumHandler
  );

  fastify.post(
    "/",
    {
      onRequest: [fastify.authenticate],
      preHandler: [requireCondoAccess({ source: "body" })],
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    createComplaintHandler
  );

  fastify.put(
    "/:id",
    {
      onRequest: [
        fastify.authenticate,
        requireTicketModify(),
        requireCondoPermissionFromComplaint("edit:complaint"),
      ],
    },
    updateComplaintHandler
  );

  fastify.patch(
    "/:id/status",
    {
      onRequest: [
        fastify.authenticate,
        requireTicketModify(),
        requireCondoPermissionFromComplaint("update:complaint_status"),
        requireSectorComplaintPermission("update:complaint_status"),
      ],
    },
    updateComplaintStatusHandler
  );

  fastify.patch(
    "/:id/priority",
    {
      onRequest: [
        fastify.authenticate,
        requireTicketModify(),
        requireCondoPermissionFromComplaint("update:complaint_priority"),
      ],
    },
    updateComplaintPriorityHandler
  );

  fastify.post(
    "/:id/comment",
    {
      onRequest: [
        fastify.authenticate,
        requireTicketModify(),
        requireCondoPermissionFromComplaint("comment:complaint"),
        requireSectorComplaintPermission("comment:complaint"),
      ],
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
      onRequest: [fastify.authenticate, requireSyndicStrict()],
    },
    runSlaScanHandler
  );

  fastify.post(
    "/:id/csat",
    { onRequest: [fastify.authenticate, requireComplaintOwner()] },
    submitCsatHandler
  );

  fastify.post(
    "/:id/nudge",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
        requireTicketView(),
      ],
    },
    nudgeComplaintHandler
  );

  fastify.post(
    "/:id/return",
    {
      onRequest: [
        fastify.authenticate,
        requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC", "ADMIN", "SETOR_MEMBER"]),
        requireTicketModify(),
        requireCondoPermissionFromComplaint("return:complaint"),
        requireSectorComplaintPermission("return:complaint"),
      ],
    },
    returnComplaintHandler
  );

  fastify.post(
    "/:id/complement",
    {
      onRequest: [fastify.authenticate, requireComplaintOwnerAction("Apenas o autor pode complementar a ocorrência")],
    },
    complementComplaintHandler
  );

  fastify.post(
    "/:id/reopen",
    {
      onRequest: [fastify.authenticate, requireComplaintOwnerAction("Apenas o autor pode reabrir a ocorrência")],
    },
    reopenComplaintHandler
  );

  fastify.delete(
    "/:id",
    {
      onRequest: [fastify.authenticate, requireTicketModify()],
    },
    deleteComplaintHandler
  );
};
