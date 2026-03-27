/**
 * Complaints Feature - Zod Schemas
 */

import { z } from "zod";

const statusEnum = z.enum([
  "NEW",
  "TRIAGE",
  "IN_PROGRESS",
  "WAITING_USER",
  "WAITING_THIRD_PARTY",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
]);

const priorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

const complaintStatusHistorySchema = z.object({
  id: z.string(),
  complaintId: z.number(),
  fromStatus: statusEnum,
  toStatus: statusEnum,
  changedBy: z.string(),
  notes: z.string().nullable().optional(),
  action: z.string().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string(),
});

export const ComplaintSchema = z.object({
  id: z.number(),
  condominiumId: z.string(),
  residentId: z.string(),
  sectorId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  category: z.string(),
  content: z.string(),
  status: statusEnum,
  priority: priorityEnum,
  isAnonymous: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  responseDueAt: z.string().nullable().optional(),
  resolutionDueAt: z.string().nullable().optional(),
  responseAt: z.string().nullable().optional(),
  pausedUntil: z.string().nullable().optional(),
  pauseReason: z.string().nullable().optional(),
  escalatedAt: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
  resident: z
    .object({
      name: z.string(),
      unit: z.string(),
      tower: z.string(),
    })
    .optional(),
  sector: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional()
    .nullable(),
  assignee: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string().email().optional(),
    })
    .optional()
    .nullable(),
  statusHistory: z.array(complaintStatusHistorySchema).optional(),
});

export const CreateComplaintSchema = z.object({
  condominiumId: z.string(),
  residentId: z.string(),
  category: z.string().min(1, "Categoria é obrigatória"),
  content: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
  priority: priorityEnum.optional().default("MEDIUM"),
  isAnonymous: z.boolean().optional().default(false),
  sectorId: z.string().optional(),
});

export const UpdateComplaintSchema = z.object({
  id: z.number(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  resolvedBy: z.string().optional(),
});

const complaintAttachmentSchema = z.object({
  id: z.string(),
  complaintId: z.number(),
  fileUrl: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  uploadedAt: z.string(),
});

// Detail response includes statusHistory, attachments, and CSAT fields
export const ComplaintDetailSchema = ComplaintSchema.extend({
  statusHistory: z.array(complaintStatusHistorySchema).optional().default([]),
  attachments: z.array(complaintAttachmentSchema).optional().default([]),
  csatScore: z.number().nullable().optional(),
  csatComment: z.string().nullable().optional(),
  csatRespondedAt: z.string().nullable().optional(),
});
