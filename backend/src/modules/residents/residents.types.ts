export type ResidentType = "OWNER" | "TENANT";

export interface CreateResidentRequest {
  condominiumId: string;
  name: string;
  email: string;
  phone: string;
  tower: string;
  floor: string;
  unit: string;
  type?: ResidentType;
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
  type?: ResidentType;
  consentWhatsapp?: boolean;
  consentDataProcessing?: boolean;
}

export interface ResidentFilters {
  condominiumId?: string;
  tower?: string;
  floor?: string;
  type?: string;
  search?: string;
}
