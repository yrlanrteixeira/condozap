/**
 * User Management Types
 */

export interface CondominiumUser {
  id: string;
  email: string;
  name: string;
  role: string;
  councilPosition?: string | null;
  assignedTower?: string | null;
  globalRole: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface UpdateCouncilPositionInput {
  userId: string;
  condominiumId: string;
  councilPosition: string | null;
}

export interface CreateAdminInput {
  email: string;
  name: string;
  password: string;
  condominiumId: string;
  /** Função no condomínio; omitir ou null para definir depois na lista. */
  councilPosition?: string | null;
}

export interface CreateSectorMemberInput {
  email: string;
  name: string;
  password: string;
  condominiumId: string;
  sectorId: string;
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

export interface CreateSyndicInput {
  email: string;
  name: string;
  password: string;
  condominiumIds: string[];
}

export interface UpdateSyndicInput {
  name: string;
  email: string;
  password?: string;
  role: 'SYNDIC' | 'PROFESSIONAL_SYNDIC';
  condominiumIds: string[];
}

