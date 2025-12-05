import { UserRole } from "@prisma/client";

/**
 * User information decoded from JWT token
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  condominiums?: Array<{
    condominiumId: string;
    role: UserRole;
  }>;
}

/**
 * Extend FastifyRequest to include typed user
 */
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: AuthUser;
  }
}
