import { z } from "zod";

export const historyQuerySchema = z.object({
  condominiumId: z.string().optional(),
});

export const historyParamsSchema = z.object({
  condominiumId: z.string().min(1),
});

export const historyLogIdParamSchema = z.object({
  logId: z.string().min(1),
});

export type HistoryQueryAll = z.infer<typeof historyQuerySchema>;
export type HistoryParams = z.infer<typeof historyParamsSchema>;
export type HistoryLogIdParams = z.infer<typeof historyLogIdParamSchema>;
