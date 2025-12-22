import { z } from "zod";

export const approveUserSchema = z.object({
  userId: z.string().min(1),
  condominiumId: z.string().min(1),
  tower: z.string().min(1),
  floor: z.string().min(1),
  unit: z.string().min(1),
  type: z.enum(["OWNER", "TENANT"]).optional().default("OWNER"),
});

export const rejectUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1),
});

export const pendingUsersParamsSchema = z.object({
  condominiumId: z.string().min(1),
});

export type ResidentType = "OWNER" | "TENANT";
export type ApproveUserBody = z.infer<typeof approveUserSchema>;
export type RejectUserBody = z.infer<typeof rejectUserSchema>;
export type PendingUsersParams = z.infer<typeof pendingUsersParamsSchema>;

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

