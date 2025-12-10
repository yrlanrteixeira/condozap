import { z } from "zod";

export const condoMetricsParamsSchema = z.object({
  condominiumId: z.string().min(1),
});

export const unifiedQuerySchema = z.object({
  condominiumIds: z.string().min(1),
});

export type CondoMetricsParamsSchema = z.infer<typeof condoMetricsParamsSchema>;
export type UnifiedQuerySchema = z.infer<typeof unifiedQuerySchema>;

