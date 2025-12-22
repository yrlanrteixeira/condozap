import { z } from "zod";

export const condoMetricsParamsSchema = z.object({
  condominiumId: z.string().min(1),
});

export const unifiedQuerySchema = z.object({
  condominiumIds: z.string().min(1),
});

export type CondoMetricsParams = z.infer<typeof condoMetricsParamsSchema>;
export type UnifiedQuery = z.infer<typeof unifiedQuerySchema>;

