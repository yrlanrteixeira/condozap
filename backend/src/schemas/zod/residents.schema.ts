/**
 * Residents Zod Schemas (SRP - Single Responsibility)
 * 
 * WHY:
 * - Validation logic isolated from routes
 * - Types are inferred automatically from schemas
 * - Easy to test in isolation
 */

import { z } from "zod";

// ============================================
// Enums
// ============================================
export const ResidentType = z.enum(["OWNER", "TENANT"]);

// ============================================
// Phone validation (Brazilian format)
// ============================================
const phoneRegex = /^55\d{10,11}$/;
const phoneSchema = z.string().regex(phoneRegex, "Telefone invalido (formato: 5511999999999)");

// ============================================
// Create Resident Schema
// ============================================
export const CreateResidentSchema = z.object({
  condominiumId: z.string().uuid("ID do condominio invalido"),
  name: z.string()
    .min(3, "Nome deve ter no minimo 3 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres"),
  email: z.string().email("Email invalido"),
  phone: phoneSchema,
  tower: z.string().min(1, "Torre e obrigatoria"),
  floor: z.string().min(1, "Andar e obrigatorio"),
  unit: z.string().min(1, "Unidade e obrigatoria"),
  type: ResidentType.optional().default("OWNER"),
  consentWhatsapp: z.boolean().optional().default(false),
  consentDataProcessing: z.boolean().optional().default(true),
});

export type CreateResidentInput = z.infer<typeof CreateResidentSchema>;

// ============================================
// Update Resident Schema
// ============================================
export const UpdateResidentSchema = z.object({
  name: z.string()
    .min(3, "Nome deve ter no minimo 3 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres")
    .optional(),
  email: z.string().email("Email invalido").optional(),
  phone: phoneSchema.optional(),
  tower: z.string().min(1).optional(),
  floor: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  type: ResidentType.optional(),
  consentWhatsapp: z.boolean().optional(),
  consentDataProcessing: z.boolean().optional(),
});

export type UpdateResidentInput = z.infer<typeof UpdateResidentSchema>;

// ============================================
// Query Filters Schema
// ============================================
export const ResidentFiltersSchema = z.object({
  tower: z.string().optional(),
  floor: z.string().optional(),
  type: ResidentType.optional(),
  search: z.string().optional(),
  condominiumId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ResidentFiltersInput = z.infer<typeof ResidentFiltersSchema>;

// ============================================
// Params Schema
// ============================================
export const ResidentIdParamSchema = z.object({
  id: z.string().uuid("ID do morador invalido"),
});
