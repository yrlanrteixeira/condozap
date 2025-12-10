import { z } from "zod";

export const priorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const statusEnum = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

export const createComplaintSchema = z.object({
  condominiumId: z.string().min(1),
  residentId: z.string().min(1),
  category: z.string().min(3),
  content: z.string().min(10),
  priority: priorityEnum.optional().default("MEDIUM"),
  isAnonymous: z.boolean().optional().default(false),
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
});

export const complaintFiltersSchema = z.object({
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  category: z.string().optional(),
  condominiumId: z.string().optional(),
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
export type UpdateComplaintPriorityRequest = z.infer<typeof updatePrioritySchema>;
export type AddComplaintCommentRequest = z.infer<typeof addCommentSchema>;
export type ComplaintFilters = z.infer<typeof complaintFiltersSchema>;

