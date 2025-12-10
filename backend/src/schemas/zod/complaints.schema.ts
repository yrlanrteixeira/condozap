/**
 * Complaints Zod Schemas (SRP - Single Responsibility)
 * 
 * Centralized validation schemas using Zod.
 * Each schema does ONE thing: validate a specific request type.
 * 
 * WHY:
 * - SRP: Schemas only validate, routes only route, services only business logic
 * - Type Safety: Zod infers TypeScript types automatically
 * - DRY: Schema is the single source of truth for validation AND types
 */

import { z } from "zod";

// ============================================
// Enums (reutilizaveis)
// ============================================
export const ComplaintPriority = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const ComplaintStatus = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

// ============================================
// Create Complaint Schema
// ============================================
export const CreateComplaintSchema = z.object({
  condominiumId: z.string().uuid("ID do condominio invalido"),
  residentId: z.string().uuid("ID do morador invalido"),
  category: z.string()
    .min(3, "Categoria deve ter no minimo 3 caracteres")
    .max(100, "Categoria deve ter no maximo 100 caracteres"),
  content: z.string()
    .min(10, "Conteudo deve ter no minimo 10 caracteres")
    .max(5000, "Conteudo deve ter no maximo 5000 caracteres"),
  priority: ComplaintPriority.optional().default("MEDIUM"),
  isAnonymous: z.boolean().optional().default(false),
});

export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;

// ============================================
// Update Status Schema
// ============================================
export const UpdateComplaintStatusSchema = z.object({
  status: ComplaintStatus,
  notes: z.string()
    .max(1000, "Observacao deve ter no maximo 1000 caracteres")
    .optional(),
});

export type UpdateComplaintStatusInput = z.infer<typeof UpdateComplaintStatusSchema>;

// ============================================
// Update Priority Schema
// ============================================
export const UpdateComplaintPrioritySchema = z.object({
  priority: ComplaintPriority,
});

export type UpdateComplaintPriorityInput = z.infer<typeof UpdateComplaintPrioritySchema>;

// ============================================
// Add Comment Schema
// ============================================
export const AddComplaintCommentSchema = z.object({
  notes: z.string()
    .min(1, "Comentario nao pode ser vazio")
    .max(2000, "Comentario deve ter no maximo 2000 caracteres"),
});

export type AddComplaintCommentInput = z.infer<typeof AddComplaintCommentSchema>;

// ============================================
// Query Filters Schema (for GET requests)
// ============================================
export const ComplaintFiltersSchema = z.object({
  status: ComplaintStatus.optional(),
  priority: ComplaintPriority.optional(),
  category: z.string().optional(),
  condominiumId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ComplaintFiltersInput = z.infer<typeof ComplaintFiltersSchema>;

// ============================================
// Params Schemas
// ============================================
export const ComplaintIdParamSchema = z.object({
  id: z.coerce.number().int().positive("ID invalido"),
});

export const CondominiumIdParamSchema = z.object({
  condominiumId: z.string().uuid("ID do condominio invalido"),
});
