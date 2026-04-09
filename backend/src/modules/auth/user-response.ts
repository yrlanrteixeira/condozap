import type { User as PrismaUser } from "@prisma/client";

type UserRow = PrismaUser & {
  forcePasswordReset?: boolean | null;
};

/**
 * Resposta de API: não expõe `forcePasswordReset`; usa `mustChangePassword`.
 */
export function userToApi(
  user: UserRow,
  extras?: { residentId?: string | null }
): Omit<UserRow, "password" | "forcePasswordReset"> & {
  mustChangePassword: boolean;
  residentId?: string;
} {
  const { password: _p, forcePasswordReset, ...rest } = user;
  return {
    ...rest,
    mustChangePassword: !!forcePasswordReset,
    ...(extras?.residentId ? { residentId: extras.residentId } : {}),
  };
}
