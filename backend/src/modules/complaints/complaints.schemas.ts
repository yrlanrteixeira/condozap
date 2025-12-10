import { z } from "zod";
import type { ComplaintPriority, ComplaintStatus } from "./complaints.types.js";

const priorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const statusEnum = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

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

export type CreateComplaintSchema = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintStatusSchema = z.infer<typeof updateStatusSchema>;
export type UpdateComplaintPrioritySchema = z.infer<
  typeof updatePrioritySchema
>;
export type AddComplaintCommentSchema = z.infer<typeof addCommentSchema>;
export type ComplaintPriorityEnum = ComplaintPriority;
export type ComplaintStatusEnum = ComplaintStatus;
