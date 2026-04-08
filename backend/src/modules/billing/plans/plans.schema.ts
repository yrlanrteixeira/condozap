import { z } from "zod";

export const createPlanSchema = z.object({
  slug: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  minCondominiums: z.number().int().min(1),
  maxCondominiums: z.number().int(),
  pricePerCondoCents: z.number().int().min(0),
  setupFeeCents: z.number().int().min(0).default(200000),
  sortOrder: z.number().int().default(0),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreatePlanRequest = z.infer<typeof createPlanSchema>;
export type UpdatePlanRequest = z.infer<typeof updatePlanSchema>;
