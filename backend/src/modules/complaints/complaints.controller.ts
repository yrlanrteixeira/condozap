import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import * as complaintService from "./complaints.service";
import {
  findComplaintByIdForUser,
  findComplaintsForUser,
} from "./complaints.repository";
import {
  addCommentSchema,
  complaintFiltersSchema,
  complaintIdParamSchema,
  complaintStatsQuerySchema,
  condominiumIdParamSchema,
  addAttachmentSchema,
  createComplaintSchema,
  pauseSlaSchema,
  resumeSlaSchema,
  assignComplaintSchema,
  updateComplaintSchema,
  updatePrioritySchema,
  updateStatusSchema,
  type AddComplaintCommentRequest,
  type AddComplaintAttachmentRequest,
  type AssignComplaintRequest,
  type ComplaintFilters,
  type CreateComplaintRequest,
  type PauseComplaintSlaRequest,
  type ResumeComplaintSlaRequest,
  type UpdateComplaintPriorityRequest,
  type UpdateComplaintStatusRequest,
} from "./complaints.schema";
import type { AuthUser } from "../../types/auth";

export async function createComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = createComplaintSchema.parse(
    request.body
  ) as CreateComplaintRequest;

  const complaint = await complaintService.createComplaint(
    prisma,
    request.log,
    body
  );

  return reply.status(201).send(complaint);
}

export async function updateComplaintStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const body = updateStatusSchema.parse(
    request.body
  ) as UpdateComplaintStatusRequest;
  const user = request.user as AuthUser;

  const updated = await complaintService.updateComplaintStatus(
    prisma,
    request.log,
    id,
    body,
    user.id
  );

  return reply.send(updated);
}

export async function updateComplaintPriorityHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const body = updatePrioritySchema.parse(
    request.body
  ) as UpdateComplaintPriorityRequest;

  const updated = await complaintService.updateComplaintPriority(
    prisma,
    request.log,
    id,
    body
  );

  return reply.send(updated);
}

export async function addComplaintCommentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const body = addCommentSchema.parse(
    request.body
  ) as AddComplaintCommentRequest;
  const user = request.user as AuthUser;

  const historyEntry = await complaintService.addComplaintComment(
    prisma,
    request.log,
    id,
    body,
    user.id,
    user.role
  );

  return reply.send(historyEntry);
}

export async function assignComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const body = assignComplaintSchema.parse(
    request.body
  ) as AssignComplaintRequest;
  const user = request.user as AuthUser;

  const updated = await complaintService.assignComplaint(
    prisma,
    request.log,
    id,
    body,
    false,
    user.id
  );

  return reply.send(updated);
}

export async function pauseComplaintSlaHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const body = pauseSlaSchema.parse(request.body) as PauseComplaintSlaRequest;
  const user = request.user as AuthUser;

  const updated = await complaintService.pauseComplaintSla(
    prisma,
    request.log,
    id,
    body,
    user.id
  );

  return reply.send(updated);
}

export async function resumeComplaintSlaHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const body = resumeSlaSchema.parse(request.body) as ResumeComplaintSlaRequest;
  const user = request.user as AuthUser;

  const updated = await complaintService.resumeComplaintSla(
    prisma,
    request.log,
    id,
    body,
    user.id
  );

  return reply.send(updated);
}

export async function addComplaintAttachmentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const body = addAttachmentSchema.parse(
    request.body
  ) as AddComplaintAttachmentRequest;
  const user = request.user as AuthUser;

  const attachment = await complaintService.addComplaintAttachment(
    prisma,
    id,
    body,
    user.id
  );

  return reply.status(201).send(attachment);
}

export async function runSlaScanHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const condominiumId = (request.query as { condominiumId?: string })
    ?.condominiumId;
  const result = await complaintService.runSlaEscalationScan(
    prisma,
    request.log,
    condominiumId
  );
  return reply.send(result);
}

export async function updateComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const body = updateComplaintSchema.parse(request.body);
  const user = request.user as AuthUser;

  const updated = await complaintService.updateComplaint(
    prisma,
    request.log,
    id,
    body,
    user.id
  );

  return reply.send(updated);
}

export async function getComplaintStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = complaintStatsQuerySchema.parse(request.query);
  const stats = await complaintService.getComplaintStats(prisma, condominiumId);
  return reply.send(stats);
}

export async function deleteComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);

  await complaintService.deleteComplaint(prisma, request.log, id);

  return reply.status(204).send();
}

export async function getAllComplaintsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const filters = complaintFiltersSchema.parse(
    request.query
  ) as ComplaintFilters;

  const user = request.user as AuthUser;
  const complaints = await findComplaintsForUser(prisma, user, filters);
  return reply.send(complaints);
}

export async function getComplaintsByCondominiumHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = condominiumIdParamSchema.parse(request.params);
  const filters = complaintFiltersSchema
    .pick({ status: true, priority: true, category: true })
    .parse(request.query);

  const user = request.user as AuthUser;
  const complaints = await findComplaintsForUser(prisma, user, {
    ...filters,
    condominiumId,
  });

  return reply.send(complaints);
}

export async function getComplaintDetailHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = complaintIdParamSchema.parse(request.params);
  const user = request.user as AuthUser;
  const complaint = await findComplaintByIdForUser(prisma, user, id);

  if (!complaint) {
    return reply.status(404).send({ error: "Complaint not found" });
  }

  return reply.send(complaint);
}

export async function submitCsatHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: { score: number; comment?: string } }>,
  reply: FastifyReply
) {
  const complaintId = Number(request.params.id);
  if (!Number.isInteger(complaintId) || complaintId <= 0) {
    return reply.status(400).send({ error: "ID da ocorrência inválido" });
  }
  const { score, comment } = request.body;

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return reply.status(400).send({ error: "Nota deve ser um número inteiro de 1 a 5" });
  }

  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) {
    return reply.status(404).send({ error: "Ocorrência não encontrada" });
  }

  if (!["RESOLVED", "CLOSED"].includes(complaint.status)) {
    return reply.status(400).send({ error: "Ocorrência deve estar resolvida ou fechada para avaliação" });
  }

  if (complaint.csatRespondedAt) {
    return reply.status(409).send({ error: "Avaliação já enviada para esta ocorrência" });
  }

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      csatScore: score,
      csatComment: comment || null,
      csatRespondedAt: new Date(),
    },
  });

  return reply.send({
    complaintId: updated.id,
    csatScore: updated.csatScore,
    csatComment: updated.csatComment,
    csatRespondedAt: updated.csatRespondedAt?.toISOString(),
  });
}
