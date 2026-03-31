/**
 * Residents Feature - Zod Schemas
 */

import { z } from "zod";

export const ResidentSchema = z.object({
  id: z.string(),
  condominiumId: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  tower: z.string(),
  floor: z.string(),
  unit: z.string(),
  type: z.enum(["OWNER", "TENANT"]),
  consentWhatsapp: z.boolean(),
  consentDataProcessing: z.boolean(),
  createdAt: z.string(),
  accountExpiresAt: z.string().nullable().optional(),
});

export const CreateResidentSchema = z.object({
  condominiumId: z.string(),
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().min(10, "Telefone inválido"),
  tower: z.string().min(1, "Torre é obrigatória"),
  floor: z.string().min(1, "Andar é obrigatório"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  type: z.enum(["OWNER", "TENANT"]),
  consentWhatsapp: z.boolean().optional().default(true),
  consentDataProcessing: z.boolean().optional().default(true),
});

export const UpdateResidentSchema = CreateResidentSchema.partial().extend({
  id: z.string(),
});


