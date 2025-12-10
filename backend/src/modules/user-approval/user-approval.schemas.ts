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

export type ApproveUserSchema = z.infer<typeof approveUserSchema>;
export type RejectUserSchema = z.infer<typeof rejectUserSchema>;
export type PendingUsersParamsSchema = z.infer<typeof pendingUsersParamsSchema>;
