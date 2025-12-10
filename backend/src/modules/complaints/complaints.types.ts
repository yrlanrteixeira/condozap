export type ComplaintPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface CreateComplaintRequest {
  condominiumId: string;
  residentId: string;
  category: string;
  content: string;
  priority?: ComplaintPriority;
  isAnonymous?: boolean;
}

export interface UpdateComplaintStatusRequest {
  status: ComplaintStatus;
  notes?: string;
}

export interface UpdateComplaintPriorityRequest {
  priority: ComplaintPriority;
}

export interface AddComplaintCommentRequest {
  notes: string;
}

export interface ComplaintFilters {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: string;
  condominiumId?: string;
}
