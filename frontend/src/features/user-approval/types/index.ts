/**
 * User Approval Types
 */

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  requestedTower: string | null;
  requestedFloor: string | null;
  requestedUnit: string | null;
  createdAt: string;
}

export interface ApproveUserInput {
  userId: string;
  condominiumId: string;
  tower: string;
  floor: string;
  unit: string;
  type?: 'OWNER' | 'TENANT';
}

export interface RejectUserInput {
  userId: string;
  reason: string;
}


