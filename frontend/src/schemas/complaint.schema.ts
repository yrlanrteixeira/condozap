import { z } from "zod";
import { COMPLAINT_CATEGORIES } from "@/config/constants";

/**
 * Schemas de validação para Complaints
 * Suporta validação de formulários e atualizações de status
 */

export const ComplaintStatusEnum = z.enum(["open", "in_progress", "resolved"]);
export const ComplaintPriorityEnum = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const ComplaintSchema = z.object({
  id: z.number().int().positive().optional(), // Gerado pelo backend
  condominiumId: z.string().cuid("ID do condomínio inválido"),
  residentId: z.string().cuid("ID do morador inválido"),
  category: z.enum(COMPLAINT_CATEGORIES, {
    errorMap: () => ({
      message:
        "Categoria inválida. Escolha: Barulho, Manutenção, Segurança, Limpeza ou Outros",
    }),
  }),
  content: z
    .string()
    .min(10, "Descrição deve ter ao menos 10 caracteres")
    .max(1000, "Descrição muito longa (máximo 1000 caracteres)"),
  status: ComplaintStatusEnum.default("open"),
  priority: ComplaintPriorityEnum.optional(),
  timestamp: z.string().datetime().optional(), // ISO 8601
  isAnonymous: z.boolean().default(false).optional(),
});

/**
 * Schema para criação de denúncia (formulário do morador)
 */
export const CreateComplaintSchema = ComplaintSchema.pick({
  condominiumId: true,
  residentId: true,
  category: true,
  content: true,
  isAnonymous: true,
});

/**
 * Schema para atualização de status (drag-and-drop no Kanban)
 */
export const UpdateComplaintStatusSchema = z.object({
  id: z.number().int().positive(),
  status: ComplaintStatusEnum,
  notes: z.string().max(500).optional(), // Notas do síndico
});

/**
 * Schema para atualização de prioridade
 */
export const UpdateComplaintPrioritySchema = z.object({
  id: z.number().int().positive(),
  priority: ComplaintPriorityEnum,
});

/**
 * Schema para filtros de busca
 */
export const ComplaintFiltersSchema = z.object({
  condominiumId: z.string().cuid().optional(),
  status: ComplaintStatusEnum.optional(),
  priority: ComplaintPriorityEnum.optional(),
  category: z.enum(COMPLAINT_CATEGORIES).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Types inferidos
export type ComplaintInput = z.infer<typeof ComplaintSchema>;
export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<
  typeof UpdateComplaintStatusSchema
>;
export type UpdateComplaintPriorityInput = z.infer<
  typeof UpdateComplaintPrioritySchema
>;
export type ComplaintFiltersInput = z.infer<typeof ComplaintFiltersSchema>;
