import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { ForbiddenError } from "../../shared/errors";
import type { AuthUser } from "../../types/auth";
import { createCannedResponseSchema, updateCannedResponseSchema } from "./canned-responses.schema";
import * as cannedResponsesService from "./canned-responses.service";

// =====================================================
// GET /api/canned-responses
// =====================================================

interface ListQuery {
  condominiumId?: string;
  sectorId?: string;
}

export async function listCannedResponsesHandler(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply
) {
  const { condominiumId, sectorId } = request.query;

  const responses = await cannedResponsesService.listCannedResponses(
    prisma,
    condominiumId,
    sectorId
  );

  return reply.send(responses);
}

// =====================================================
// POST /api/canned-responses
// =====================================================

export async function createCannedResponseHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const body = createCannedResponseSchema.parse(request.body);

  // Canned responses are always scoped to a condominium.
  if (!body.condominiumId) {
    throw new ForbiddenError(
      "Respostas enlatadas devem ser vinculadas a um condomínio"
    );
  }

  const response = await cannedResponsesService.createCannedResponse(
    prisma,
    body,
    user.id
  );

  return reply.status(201).send(response);
}

// =====================================================
// PATCH /api/canned-responses/:id
// =====================================================

export async function updateCannedResponseHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const body = updateCannedResponseSchema.parse(request.body);
  const user = request.user as AuthUser;

  const response = await cannedResponsesService.updateCannedResponse(
    prisma,
    id,
    body,
    { id: user.id, role: user.role }
  );

  return reply.send(response);
}

// =====================================================
// DELETE /api/canned-responses/:id
// =====================================================

export async function deleteCannedResponseHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const user = request.user as AuthUser;

  await cannedResponsesService.deleteCannedResponse(prisma, id, {
    id: user.id,
    role: user.role,
  });

  return reply.send({ success: true });
}
