import { z } from "zod";

export const createPixBillSchema = z.object({}).passthrough();
export const createCardBillSchema = z.object({}).passthrough();

export const createManualBillSchema = z.object({
  amountCents: z.number().int().min(100),
  description: z.string().min(1).max(200).default("Cobrança manual"),
});

export type CreateManualBillRequest = z.infer<typeof createManualBillSchema>;
