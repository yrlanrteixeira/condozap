import { z } from "zod";

export const createCannedResponseSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  condominiumId: z.string().optional(),
  sectorId: z.string().optional(),
});

export const updateCannedResponseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  sectorId: z.string().nullable().optional(),
});

export type CreateCannedResponseRequest = z.infer<typeof createCannedResponseSchema>;
export type UpdateCannedResponseRequest = z.infer<typeof updateCannedResponseSchema>;
