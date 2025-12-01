/**
 * Complaints Feature - Type Definitions
 */

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
export type ComplaintPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface Complaint {
  id: number
  condominiumId: string
  residentId: string
  category: string
  content: string
  status: ComplaintStatus
  priority: ComplaintPriority
  isAnonymous: boolean
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
  resolvedBy?: string | null
  timestamp?: string // Alias para createdAt (compatibilidade)
  resident?: {
    name: string
    unit: string
    tower: string
  }
}

export interface CreateComplaintInput {
  condominium_id: string
  resident_id: string
  category: string
  content: string
  priority?: ComplaintPriority
  is_anonymous?: boolean
}

export interface UpdateComplaintInput {
  id: number
  status?: ComplaintStatus
  priority?: ComplaintPriority
  resolved_by?: string
}

export interface ComplaintFilters {
  status?: ComplaintStatus
  priority?: ComplaintPriority
  category?: string
  residentId?: string
  search?: string
}

export interface ComplaintAttachment {
  id: string
  complaintId: number
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

export interface ComplaintStatusHistory {
  id: string
  complaintId: number
  fromStatus: ComplaintStatus
  toStatus: ComplaintStatus
  changedBy: string
  notes?: string
  createdAt: string
}

export interface ComplaintStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  byPriority: Record<ComplaintPriority, number>
  byCategory: Record<string, number>
  avgResolutionTime: number // in hours
}


