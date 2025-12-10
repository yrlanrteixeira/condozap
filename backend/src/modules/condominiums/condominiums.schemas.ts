import { z } from "zod";

export const createCondominiumSchema = z.object({
  name: z.string().min(3),
  cnpj: z.string().min(3),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

export const updateCondominiumSchema = z.object({
  name: z.string().min(3).optional(),
  cnpj: z.string().min(3).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]).optional(),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

export type CreateCondominiumSchema = z.infer<typeof createCondominiumSchema>;
export type UpdateCondominiumSchema = z.infer<typeof updateCondominiumSchema>;
