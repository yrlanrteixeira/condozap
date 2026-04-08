import { z } from "zod";

export const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(365),
});

export const reactivateSchema = z.object({
  periodEndDays: z.number().int().min(1).max(365).default(30),
});

export const assignPlanSchema = z.object({
  planId: z.string().min(1),
  periodEndDays: z.number().int().min(1).max(365).default(30),
});

export type ExtendTrialRequest = z.infer<typeof extendTrialSchema>;
export type ReactivateRequest = z.infer<typeof reactivateSchema>;
export type AssignPlanRequest = z.infer<typeof assignPlanSchema>;
