import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  approveUserSchema,
  pendingUsersParamsSchema,
  rejectUserSchema,
  type ApproveUserBody,
  type PendingUsersParams,
  type RejectUserBody,
} from "./user-approval.schema";
import {
  approveUser,
  getCondominiumsList,
  getMyStatus,
  getPendingUsers,
  getPendingUsersByCondominium,
  getPendingUsersForMyCondominiums,
  rejectUser,
} from "./user-approval.service";
import type { AuthUser } from "../../types/auth";

export async function listCondominiumsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const condominiums = await getCondominiumsList(prisma);
  return reply.send(condominiums);
}

export async function listPendingUsersHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const pendingUsers = await getPendingUsers(prisma);
  return reply.send(pendingUsers);
}

export async function listPendingUsersForMyCondominiumsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const pendingUsers = await getPendingUsersForMyCondominiums(prisma, user);
  return reply.send(pendingUsers);
}

export async function listPendingUsersByCondoHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = pendingUsersParamsSchema.parse(
    request.params
  ) as PendingUsersParams;
  const user = request.user as AuthUser;

  const pendingUsers = await getPendingUsersByCondominium(
    prisma,
    condominiumId,
    user
  );

  return reply.send(pendingUsers);
}

export async function approveUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const body = approveUserSchema.parse(request.body) as ApproveUserBody;

  const result = await approveUser(prisma, user, body);
  return reply.send({
    message: "User approved successfully",
    user: result,
  });
}

export async function rejectUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const body = rejectUserSchema.parse(request.body) as RejectUserBody;

  const rejectedUser = await rejectUser(prisma, user, body);

  return reply.send({
    message: "User rejected",
    user: rejectedUser,
  });
}

export async function myStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;
  const userStatus = await getMyStatus(prisma, user.id);
  return reply.send(userStatus);
}
