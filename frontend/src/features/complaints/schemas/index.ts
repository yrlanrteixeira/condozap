/**
 * Complaints Feature - Zod Schemas
 */

import { z } from "zod";

export const ComplaintSchema = z.object({
  id: z.number(),
  condominiumId: z.string(),
  residentId: z.string(),
  category: z.string(),
  content: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  isAnonymous: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
  resident: z
    .object({
      name: z.string(),
      unit: z.string(),
      tower: z.string(),
    })
    .optional(),
});

export const CreateComplaintSchema = z.object({
  condominium_id: z.string(),
  resident_id: z.string(),
  category: z.string().min(1, "Categoria é obrigatória"),
  content: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
  priority: z
    .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
    .optional()
    .default("MEDIUM"),
  is_anonymous: z.boolean().optional().default(false),
});

export const UpdateComplaintSchema = z.object({
  id: z.number(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  resolved_by: z.string().optional(),
});
