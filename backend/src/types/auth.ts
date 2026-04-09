import { PermissionScope } from "@prisma/client";
import { Role, Scope } from "../auth/roles";

/**
 * User information decoded from JWT token
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  permissionScope?: PermissionScope | Scope;
  residentId?: string;
  /** Quando true, o usuário deve definir nova senha (JWT / primeiro acesso). */
  mustChangePassword?: boolean;
  condominiums?: Array<{
    condominiumId: string;
    role: Role;
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
