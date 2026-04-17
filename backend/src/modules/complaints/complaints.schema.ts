import { z } from "zod";

export const priorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const statusEnum = z.enum([
  "OPEN",
  "NEW",
  "TRIAGE",
  "IN_PROGRESS",
  "WAITING_USER",
  "WAITING_THIRD_PARTY",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
  "RETURNED",
  "REOPENED",
]);

export const createComplaintSchema = z.object({
  condominiumId: z.string().min(1),
  residentId: z.string().min(1),
  category: z.string().min(3),
  content: z.string().min(10),
  idempotencyKey: z.string().min(8).max(120).optional(),
  priority: priorityEnum.optional().default("MEDIUM"),
  isAnonymous: z.boolean().optional().default(false),
  sectorId: z.string().optional(),
  attachments: z.array(z.object({
    fileUrl: z.string().url(),
    fileName: z.string().min(1),
    fileType: z.string(),
    fileSize: z.number().max(10 * 1024 * 1024),
  })).optional().default([]),
});

export const updateStatusSchema = z.object({
  status: statusEnum,
  notes: z.string().min(1).optional(),
});

export const updatePrioritySchema = z.object({
  priority: priorityEnum,
});

export const addCommentSchema = z.object({
  notes: z.string().min(1),
  notifyWhatsapp: z.boolean().optional().default(true),
});

export const assignComplaintSchema = z.object({
  sectorId: z.string().min(1),
  assigneeId: z.string().optional(),
  reason: z.string().min(1).optional(),
});

export const pauseSlaSchema = z.object({
  status: z.enum(["WAITING_USER", "WAITING_THIRD_PARTY"]),
  reason: z.string().min(1),
  pausedUntil: z.coerce.date().optional(),
});

export const resumeSlaSchema = z.object({
  notes: z.string().min(1).optional(),
});

export const addAttachmentSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileType: z
    .enum(["image/png", "image/jpeg", "image/webp", "audio/mpeg", "audio/mp4"])
    .or(z.string().regex(/^audio\/|^image\//)),
  fileSize: z.number().max(10 * 1024 * 1024),
});

export const updateComplaintSchema = z.object({
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  category: z.string().optional(),
  content: z.string().optional(),
  resolvedBy: z.string().optional(),
});

export const complaintStatsQuerySchema = z.object({
  condominiumId: z.string().optional(),
});

export const complaintFiltersSchema = z.object({
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  category: z.string().optional(),
  condominiumId: z.string().optional(),
  sectorId: z.string().optional(),
  assigneeId: z.string().optional(),
});

export const complaintIdParamSchema = z.object({
  id: z.coerce.number(),
});

export const condominiumIdParamSchema = z.object({
  condominiumId: z.string().min(1),
});

export type ComplaintPriority = z.infer<typeof priorityEnum>;
export type ComplaintStatus = z.infer<typeof statusEnum>;
export type CreateComplaintRequest = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintStatusRequest = z.infer<typeof updateStatusSchema>;
export type UpdateComplaintPriorityRequest = z.infer<
  typeof updatePrioritySchema
>;
export type AddComplaintCommentRequest = z.infer<typeof addCommentSchema>;
export type AssignComplaintRequest = z.infer<typeof assignComplaintSchema>;
export type PauseComplaintSlaRequest = z.infer<typeof pauseSlaSchema>;
export type ResumeComplaintSlaRequest = z.infer<typeof resumeSlaSchema>;
export type AddComplaintAttachmentRequest = z.infer<typeof addAttachmentSchema>;
export type UpdateComplaintRequest = z.infer<typeof updateComplaintSchema>;
export type ComplaintStatsQuery = z.infer<typeof complaintStatsQuerySchema>;
export type ComplaintFilters = z.infer<typeof complaintFiltersSchema>;
