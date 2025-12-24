import { FastifyRequest, FastifyReply } from "fastify";
import { UserRole } from "@prisma/client";
import { AuthUser } from "../../types/auth";
import { prisma } from "../db/prisma";

/**
 * Configuration for condominium access check
 */
interface CondoAccessConfig {
  /**
   * Name of the parameter that contains the condominiumId
   * Can be in params, query, or body
   * @default "condominiumId"
   */
  paramName?: string;

  /**
   * Where to look for the condominiumId
   * @default "params"
   */
  source?: "params" | "query" | "body";

  /**
   * Roles that bypass the membership check (have global access)
   * @default ["SUPER_ADMIN"]
   */
  bypassRoles?: UserRole[];
}

/**
 * Middleware to check if user has access to a specific condominium
 *
 * - SUPER_ADMIN: has access to all condominiums
 * - Other roles: must be a member of the condominium
 *
 * @param config - Configuration object
 * @returns Fastify hook function
 *
 * @example
 * ```typescript
 * // Check access using params.condominiumId
 * fastify.get('/condominiums/:condominiumId/residents', {
 *   onRequest: [
 *     fastify.authenticate,
 *     requireCondoAccess()
 *   ]
 * }, handler);
 *
 * // Check access using body.condominiumId
 * fastify.post('/residents', {
 *   onRequest: [
 *     fastify.authenticate,
 *     requireCondoAccess({ source: 'body' })
 *   ]
 * }, handler);
 * ```
 */
export const requireCondoAccess = (config: CondoAccessConfig = {}) => {
  const {
    paramName = "condominiumId",
    source = "params",
    bypassRoles = ["SUPER_ADMIN"],
  } = config;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Usuário não autenticado",
      });
    }

    // Bypass check for certain roles (e.g., SUPER_ADMIN)
    if (bypassRoles.includes(user.role as UserRole)) {
      return;
    }

    // Get condominiumId from the specified source
    let condominiumId: string | undefined;

    switch (source) {
      case "params":
        condominiumId = (request.params as any)[paramName];
        break;
      case "query":
        condominiumId = (request.query as any)[paramName];
        break;
      case "body":
        condominiumId = (request.body as any)?.[paramName];
        break;
    }

    if (!condominiumId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: `${paramName} não fornecido`,
      });
    }

    // Check if user is a member of the condominium
    const membership = await prisma.userCondominium.findUnique({
      where: {
        userId_condominiumId: {
          userId: user.id,
          condominiumId: condominiumId,
        },
      },
    });

    if (!membership) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Você não tem acesso a este condomínio",
      });
    }
  };
};
