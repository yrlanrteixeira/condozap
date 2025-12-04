/**
 * User Approval Types
 */

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  requestedCondominiumId: string | null;
  requestedTower: string | null;
  requestedFloor: string | null;
  requestedUnit: string | null;
  requestedPhone: string | null;
  consentWhatsapp: boolean;
  consentDataProcessing: boolean;
  createdAt: string;
}

export interface Condominium {
  id: string;
  name: string;
  status: string;
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


