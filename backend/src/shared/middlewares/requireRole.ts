import { FastifyRequest, FastifyReply } from "fastify";
import { UserRole } from "@prisma/client";
import { AuthUser } from "../../types/auth";

/**
 * Middleware to check if user has one of the required roles
 *
 * @param roles - Array of allowed UserRole values
 * @returns Fastify hook function
 *
 * @example
 * ```typescript
 * fastify.get('/admin/users', {
 *   onRequest: [
 *     fastify.authenticate,
 *     requireRole(['SUPER_ADMIN', 'ADMIN'])
 *   ]
 * }, handler);
 * ```
 */
export const requireRole = (roles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Usuário não autenticado",
      });
    }

    if (!roles.includes(user.role)) {
      return reply.status(403).send({
        error: "Forbidden",
        message: `Acesso negado. Roles permitidos: ${roles.join(", ")}`,
      });
    }
  };
};

/**
 * Shorthand for requiring SUPER_ADMIN role only
 */
export const requireSuperAdmin = () => requireRole(["SUPER_ADMIN"]);

/**
 * Shorthand for requiring admin roles (SUPER_ADMIN, PROFESSIONAL_SYNDIC, ADMIN, SYNDIC)
 */
export const requireAdmin = () =>
  requireRole(["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"]);
