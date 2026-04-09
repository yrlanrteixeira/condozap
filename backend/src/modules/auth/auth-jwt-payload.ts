import type { PermissionScope, UserRole } from "@prisma/client";

export type AccessTokenPayload = {
  id: string;
  email: string;
  role: UserRole | string;
  status: string;
  name: string;
  permissionScope: PermissionScope | string;
  residentId?: string;
  mustChangePassword: boolean;
};

export function buildAccessTokenPayload(user: {
  id: string;
  email: string;
  role: UserRole | string;
  status: string;
  name: string;
  permissionScope: PermissionScope | string;
  residentId?: string | null;
  forcePasswordReset?: boolean | null;
}): AccessTokenPayload {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    name: user.name,
    permissionScope: user.permissionScope,
    ...(user.residentId ? { residentId: user.residentId } : {}),
    mustChangePassword: !!user.forcePasswordReset,
  };
}
