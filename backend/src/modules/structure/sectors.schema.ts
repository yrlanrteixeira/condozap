import { z } from "zod";

export const sectorParamsSchema = z.object({
  condominiumId: z.string().min(1),
  sectorId: z.string().min(1),
});

export const createSectorSchema = z.object({
  name: z.string().min(2),
  categories: z.array(z.string().min(1)).default([]),
});

export const updateSectorSchema = z.object({
  name: z.string().min(2).optional(),
  categories: z.array(z.string().min(1)).optional(),
});

export const setMembersSchema = z.object({
  members: z
    .array(
      z.object({
        userId: z.string().min(1),
        order: z.number().int().min(0).optional(),
        workload: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .min(1),
});

export type CreateSectorBody = z.infer<typeof createSectorSchema>;
export type UpdateSectorBody = z.infer<typeof updateSectorSchema>;
export type SetMembersBody = z.infer<typeof setMembersSchema>;

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  order: z.number().int().min(0).optional(),
  workload: z.number().int().min(0).optional(),
});

export type AddMemberBody = z.infer<typeof addMemberSchema>;



