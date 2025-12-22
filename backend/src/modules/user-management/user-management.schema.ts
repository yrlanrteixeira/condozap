import { z } from "zod";

export const createAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(8),
  condominiumId: z.string().min(1),
});

export const createSyndicSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(8),
  condominiumIds: z.array(z.string().min(1)).min(1),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  newRole: z.enum(["ADMIN", "SYNDIC", "RESIDENT"]),
});

export const removeUserSchema = z.object({
  userId: z.string().min(1),
  condominiumId: z.string().min(1),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  condominiumId: z.string().min(1),
  role: z.enum(["ADMIN", "SYNDIC", "RESIDENT"]),
});

export type UserRole = "ADMIN" | "SYNDIC" | "RESIDENT";
export type CreateAdminRequest = z.infer<typeof createAdminSchema>;
export type CreateSyndicRequest = z.infer<typeof createSyndicSchema>;
export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleSchema>;
export type RemoveUserRequest = z.infer<typeof removeUserSchema>;
export type InviteUserRequest = z.infer<typeof inviteUserSchema>;

