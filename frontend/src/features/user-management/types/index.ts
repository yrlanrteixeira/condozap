/**
 * User Management Types
 */

export interface CondominiumUser {
  id: string;
  email: string;
  name: string;
  role: string;
  globalRole: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface CreateAdminInput {
  email: string;
  name: string;
  password: string;
  condominiumId: string;
}

export interface UpdateUserRoleInput {
  userId: string;
  newRole: 'ADMIN' | 'SYNDIC' | 'RESIDENT';
}

export interface RemoveUserInput {
  userId: string;
  condominiumId: string;
}

export interface InviteUserInput {
  email: string;
  condominiumId: string;
  role: 'ADMIN' | 'SYNDIC' | 'RESIDENT';
}

