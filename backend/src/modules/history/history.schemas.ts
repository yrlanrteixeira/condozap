import { z } from "zod";

export const historyQuerySchema = z.object({
  condominiumId: z.string().optional(),
});

export const historyParamsSchema = z.object({
  condominiumId: z.string(),
});

export type HistoryQuerySchema = z.infer<typeof historyQuerySchema>;
export type HistoryParamsSchema = z.infer<typeof historyParamsSchema>;

