import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import * as complaintService from "./complaints.service";
import {
  addCommentSchema,
  complaintFiltersSchema,
  complaintIdParamSchema,
  condominiumIdParamSchema,
  createComplaintSchema,
  updatePrioritySchema,
  updateStatusSchema,
  type AddComplaintCommentRequest,
  type ComplaintFilters,
  type CreateComplaintRequest,
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

  const complaints = await complaintService.getAllComplaints(prisma, filters);
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

  const complaints = await complaintService.getComplaintsByCondominium(
    prisma,
    condominiumId,
    filters
  );

  return reply.send(complaints);
}
