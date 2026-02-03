import { z } from "zod";

export const condominiumStatusEnum = z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]);

export const createCondominiumSchema = z.object({
  name: z.string().min(3),
  cnpj: z.string().min(3),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

export const updateCondominiumSchema = z.object({
  name: z.string().min(3).optional(),
  cnpj: z.string().min(3).optional(),
  status: condominiumStatusEnum.optional(),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
  structure: z.record(z.unknown()).optional(),
});

/** Schema para ADMIN/SYNDIC atualizarem apenas nome, estrutura e WhatsApp do condomínio */
export const updateCondominiumSettingsSchema = z.object({
  name: z.string().min(3).optional(),
  structure: z.record(z.unknown()).optional(),
  whatsappPhone: z.string().optional().nullable(),
  whatsappBusinessId: z.string().optional().nullable(),
});

export type CondominiumStatus = z.infer<typeof condominiumStatusEnum>;
export type CreateCondominiumRequest = z.infer<typeof createCondominiumSchema>;
export type UpdateCondominiumRequest = z.infer<typeof updateCondominiumSchema>;
export type UpdateCondominiumSettingsRequest = z.infer<
  typeof updateCondominiumSettingsSchema
>;

