export type ResidentType = "OWNER" | "TENANT";

export interface ApproveUserBody {
  userId: string;
  condominiumId: string;
  tower: string;
  floor: string;
  unit: string;
  type?: ResidentType;
}

export interface RejectUserBody {
  userId: string;
  reason: string;
}

export interface PendingUsersParams {
  condominiumId: string;
}

export interface CondominiumsListItem {
  id: string;
  name: string;
  status: string;
}

export interface UserStatusResponse {
  id: string;
  name: string;
  email: string;
  status: string;
  approvedAt: Date | null;
  rejectionReason: string | null;
  requestedTower: string | null;
  requestedFloor: string | null;
  requestedUnit: string | null;
}
