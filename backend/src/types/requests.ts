/**
 * Request Types
 *
 * Type definitions for request bodies
 */

// ============================================
// Resident Requests
// ============================================

export interface CreateResidentRequest {
  condominiumId: string;
  name: string;
  email: string;
  phone: string;
  tower: string;
  floor: string;
  unit: string;
  type?: "OWNER" | "TENANT";
  consentWhatsapp?: boolean;
  consentDataProcessing?: boolean;
}

export interface UpdateResidentRequest {
  name?: string;
  email?: string;
  phone?: string;
  tower?: string;
  floor?: string;
  unit?: string;
  type?: "OWNER" | "TENANT";
  consentWhatsapp?: boolean;
  consentDataProcessing?: boolean;
}

// ============================================
// Complaint Requests
// ============================================

export interface CreateComplaintRequest {
  condominiumId: string;
  residentId: string;
  category: string;
  content: string;
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  isAnonymous?: boolean;
}

export interface UpdateComplaintStatusRequest {
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  notes?: string;
}

export interface UpdateComplaintPriorityRequest {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface AddComplaintCommentRequest {
  notes: string;
}

// ============================================
// Condominium Requests
// ============================================

export interface CreateCondominiumRequest {
  name: string;
  cnpj: string;
  whatsappPhone?: string;
  whatsappBusinessId?: string;
}

export interface UpdateCondominiumRequest {
  name?: string;
  cnpj?: string;
  status?: "TRIAL" | "ACTIVE" | "SUSPENDED";
  whatsappPhone?: string;
  whatsappBusinessId?: string;
}

// ============================================
// User Requests
// ============================================

export interface CreateAdminRequest {
  email: string;
  name: string;
  password: string;
  condominiumId: string;
}

export interface CreateSyndicRequest {
  email: string;
  name: string;
  password: string;
  condominiumIds: string[];
}

export interface UpdateUserRoleRequest {
  userId: string;
  newRole: "ADMIN" | "SYNDIC" | "RESIDENT";
}

export interface RemoveUserRequest {
  userId: string;
  condominiumId: string;
}

export interface InviteUserRequest {
  email: string;
  condominiumId: string;
  role: "ADMIN" | "SYNDIC" | "RESIDENT";
}

// ============================================
// Query Filters
// ============================================

export interface ResidentFilters {
  tower?: string;
  floor?: string;
  type?: string;
  search?: string;
  condominiumId?: string;
}

export interface ComplaintFilters {
  status?: string;
  priority?: string;
  category?: string;
  condominiumId?: string;
}
