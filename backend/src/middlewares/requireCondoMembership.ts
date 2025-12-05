import { FastifyRequest, FastifyReply } from "fastify";
import { UserRole } from "@prisma/client";
import { AuthUser } from "../types/auth.js";
import { prisma } from "../lib/prisma.js";

/**
 * Middleware to check if user belongs to at least one condominium
 *
 * - SUPER_ADMIN: bypasses the check (has global access)
 * - Other roles: must be a member of at least one condominium
 *
 * Useful for endpoints that list user's condominiums or require condominium context
 *
 * @param bypassRoles - Roles that bypass the check
 * @returns Fastify hook function
 *
 * @example
 * ```typescript
 * fastify.get('/my-condominiums', {
 *   onRequest: [
 *     fastify.authenticate,
 *     requireCondoMembership()
 *   ]
 * }, handler);
 * ```
 */
export const requireCondoMembership = (
  bypassRoles: UserRole[] = ["SUPER_ADMIN"]
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Usuário não autenticado",
      });
    }

    // Bypass check for certain roles
    if (bypassRoles.includes(user.role)) {
      return;
    }

    // Check if user belongs to at least one condominium
    const membershipCount = await prisma.userCondominium.count({
      where: {
        userId: user.id,
      },
    });

    if (membershipCount === 0) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Você não pertence a nenhum condomínio",
      });
    }
  };
};
