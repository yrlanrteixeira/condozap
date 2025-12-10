import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma";
import { AuthUser } from "../../types/auth";
import {
  requireSuperAdmin,
  requireAdmin,
  requireCondoAccess,
} from "../../middlewares";
import {
  approveUserSchema,
  pendingUsersParamsSchema,
  rejectUserSchema,
} from "./user-approval.schemas";
import {
  getCondominiumsList,
  getPendingUsers,
  getPendingUsersByCondominium,
  approveUser,
  rejectUser,
  getMyStatus,
} from "./user-approval.service";
import type { PendingUsersParams } from "./user-approval.types";

export const userApprovalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/condominiums/list",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (_request, reply) => {
      const condominiums = await getCondominiumsList(prisma);
      return reply.send(condominiums);
    }
  );

  fastify.get(
    "/users/pending/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (_request, reply) => {
      const pendingUsers = await getPendingUsers(prisma);
      return reply.send(pendingUsers);
    }
  );

  fastify.get(
    "/users/pending/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
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
  );

  fastify.post(
    "/users/approve",
    {
      onRequest: [
        fastify.authenticate,
        requireAdmin(),
        requireCondoAccess({ source: "body" }),
      ],
    },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const body = approveUserSchema.parse(request.body);

      try {
        const result = await approveUser(prisma, user, body);
        fastify.log.info(`User ${result.id} approved by ${user.id}`);

        return reply.send({
          message: "User approved successfully",
          user: result,
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to approve user");
        return reply.status(500).send({ error: "Failed to approve user" });
      }
    }
  );

  fastify.post(
    "/users/reject",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;
      const body = rejectUserSchema.parse(request.body);

      try {
        const rejectedUser = await rejectUser(prisma, user, body);

        fastify.log.info(`User ${rejectedUser.id} rejected by ${user.id}`);

        return reply.send({
          message: "User rejected",
          user: rejectedUser,
        });
      } catch (error) {
        fastify.log.error({ error }, "Failed to reject user");
        return reply.status(500).send({ error: "Failed to reject user" });
      }
    }
  );

  fastify.get(
    "/users/my-status",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const userStatus = await getMyStatus(prisma, user.id);
      return reply.send(userStatus);
    }
  );
};


