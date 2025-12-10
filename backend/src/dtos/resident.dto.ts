/**
 * Resident DTOs (ISP - Interface Segregation Principle)
 * 
 * WHY:
 * - Control what is exposed to different clients
 * - Hide internal fields (userId links, etc)
 */

import type { Resident, User } from "@prisma/client";

// ============================================
// Types
// ============================================

type ResidentWithUser = Resident & {
  user?: User | null;
};

// ============================================
// Response DTOs
// ============================================

export interface ResidentListItemDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  tower: string;
  floor: string;
  unit: string;
  type: string;
  consentWhatsapp: boolean;
  createdAt: Date;
}

export interface ResidentDetailDTO extends ResidentListItemDTO {
  consentDataProcessing: boolean;
  updatedAt: Date;
  // User info if linked
  linkedUser?: {
    id: string;
    email: string;
    status: string;
  } | null;
}

// ============================================
// Transform Functions
// ============================================

export function toResidentListDTO(resident: Resident): ResidentListItemDTO {
  return {
    id: resident.id,
    name: resident.name,
    email: resident.email,
    phone: resident.phone,
    tower: resident.tower,
    floor: resident.floor,
    unit: resident.unit,
    type: resident.type,
    consentWhatsapp: resident.consentWhatsapp,
    createdAt: resident.createdAt,
  };
}

export function toResidentDetailDTO(resident: ResidentWithUser): ResidentDetailDTO {
  return {
    ...toResidentListDTO(resident),
    consentDataProcessing: resident.consentDataProcessing,
    updatedAt: resident.updatedAt,
    linkedUser: resident.user ? {
      id: resident.user.id,
      email: resident.user.email,
      status: resident.user.status,
    } : null,
  };
}

export function toResidentListDTOs(residents: Resident[]): ResidentListItemDTO[] {
  return residents.map(toResidentListDTO);
}
