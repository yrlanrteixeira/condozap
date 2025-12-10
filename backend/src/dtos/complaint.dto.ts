/**
 * Complaint DTOs (ISP - Interface Segregation Principle)
 * 
 * Data Transfer Objects that control what data is exposed to clients.
 * Never expose raw database models directly.
 * 
 * WHY:
 * - ISP: Routes receive only the data they need
 * - Security: Sensitive fields (internal IDs, timestamps) are hidden
 * - Consistency: Response format is always the same
 */

import type { Complaint, Resident, Condominium, ComplaintStatusHistory } from "@prisma/client";

// ============================================
// Types for DB models with relations
// ============================================

type ComplaintWithRelations = Complaint & {
  resident?: Resident | null;
  condominium?: { id: string; name: string } | null;
  attachments?: Array<{ id: string; url: string; filename: string }>;
  statusHistory?: ComplaintStatusHistory[];
};

// ============================================
// Response DTOs
// ============================================

export interface ComplaintListItemDTO {
  id: number;
  category: string;
  content: string;
  status: string;
  priority: string;
  isAnonymous: boolean;
  createdAt: Date;
  // Resident info (hidden if anonymous)
  resident?: {
    id: string;
    name: string;
    tower: string;
    floor: string;
    unit: string;
  } | null;
  // Condominium info
  condominium?: {
    id: string;
    name: string;
  } | null;
}

export interface ComplaintDetailDTO extends ComplaintListItemDTO {
  resolvedAt: Date | null;
  resolvedBy: string | null;
  updatedAt: Date;
  // Extended relations
  attachments: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
  statusHistory: Array<{
    id: number;
    fromStatus: string;
    toStatus: string;
    notes: string | null;
    createdAt: Date;
  }>;
}

// ============================================
// Transform Functions
// ============================================

/**
 * Transform complaint to list item DTO
 * Hides resident info if complaint is anonymous
 */
export function toComplaintListDTO(complaint: ComplaintWithRelations): ComplaintListItemDTO {
  return {
    id: complaint.id,
    category: complaint.category,
    content: complaint.content,
    status: complaint.status,
    priority: complaint.priority,
    isAnonymous: complaint.isAnonymous,
    createdAt: complaint.createdAt,
    // Hide resident if anonymous
    resident: complaint.isAnonymous ? null : complaint.resident ? {
      id: complaint.resident.id,
      name: complaint.resident.name,
      tower: complaint.resident.tower,
      floor: complaint.resident.floor,
      unit: complaint.resident.unit,
    } : null,
    condominium: complaint.condominium ? {
      id: complaint.condominium.id,
      name: complaint.condominium.name,
    } : null,
  };
}

/**
 * Transform complaint to detail DTO
 */
export function toComplaintDetailDTO(complaint: ComplaintWithRelations): ComplaintDetailDTO {
  const listDTO = toComplaintListDTO(complaint);
  
  return {
    ...listDTO,
    resolvedAt: complaint.resolvedAt,
    resolvedBy: complaint.resolvedBy,
    updatedAt: complaint.updatedAt,
    attachments: (complaint.attachments || []).map(a => ({
      id: a.id,
      url: a.url,
      filename: a.filename,
    })),
    statusHistory: (complaint.statusHistory || []).map(h => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      notes: h.notes,
      createdAt: h.createdAt,
    })),
  };
}

/**
 * Transform array of complaints to list DTOs
 */
export function toComplaintListDTOs(complaints: ComplaintWithRelations[]): ComplaintListItemDTO[] {
  return complaints.map(toComplaintListDTO);
}
