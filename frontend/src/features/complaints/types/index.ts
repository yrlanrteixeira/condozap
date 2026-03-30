/**
 * Complaints Feature - Type Definitions
 */

export type ComplaintStatus =
  | "NEW"
  | "TRIAGE"
  | "IN_PROGRESS"
  | "WAITING_USER"
  | "WAITING_THIRD_PARTY"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED"
  | "RETURNED"
  | "REOPENED";
export type ComplaintPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Complaint {
  id: number;
  condominiumId: string;
  residentId: string;
  sectorId?: string | null;
  assigneeId?: string | null;
  category: string;
  content: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  responseDueAt?: string | null;
  resolutionDueAt?: string | null;
  responseAt?: string | null;
  pausedUntil?: string | null;
  pauseReason?: string | null;
  escalatedAt?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  lastNudgedAt?: string | null;
  closedAt?: string | null;
  timestamp?: string; // Alias para createdAt (compatibilidade)
  resident?: {
    name: string;
    unit: string;
    tower: string;
  };
  sector?: {
    id: string;
    name: string;
  } | null;
  /** Incluído na listagem quando disponível (backend envia); usado para mostrar último comentário ao morador */
  statusHistory?: ComplaintStatusHistory[];
}

export interface CreateComplaintInput {
  condominiumId: string;
  residentId: string;
  category: string;
  content: string;
  priority?: ComplaintPriority;
  isAnonymous?: boolean;
  sectorId?: string;
}

export interface UpdateComplaintInput {
  id: number;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  resolvedBy?: string;
}

export interface ComplaintFilters {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: string;
  residentId?: string;
  sectorId?: string;
  assigneeId?: string;
  search?: string;
}

export interface ComplaintAttachment {
  id: string;
  complaintId: number;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ComplaintStatusHistory {
  id: string;
  complaintId: number;
  fromStatus: ComplaintStatus;
  toStatus: ComplaintStatus;
  changedBy: string;
  notes?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ComplaintStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  byPriority: Record<ComplaintPriority, number>;
  byCategory: Record<string, number>;
  avgResolutionTime: number; // in hours
}

/** Complaint with statusHistory and attachments (detail API) */
export interface ComplaintDetail extends Complaint {
  statusHistory?: ComplaintStatusHistory[];
  attachments?: ComplaintAttachment[];
  csatScore?: number | null;
  csatComment?: string | null;
  csatRespondedAt?: string | null;
}
