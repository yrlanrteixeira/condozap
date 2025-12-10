export type UserRole = "ADMIN" | "SYNDIC" | "RESIDENT";

export interface CreateAdminRequest {
  email: string;
  name: string;
  password: string;
  condominiumId: string;
}

export interface CreateSyndicRequest {
  email: string;
  name: string;
  password: string;
  condominiumIds: string[];
}

export interface UpdateUserRoleRequest {
  userId: string;
  newRole: UserRole;
}

export interface RemoveUserRequest {
  userId: string;
  condominiumId: string;
}

export interface InviteUserRequest {
  email: string;
  condominiumId: string;
  role: UserRole;
}

