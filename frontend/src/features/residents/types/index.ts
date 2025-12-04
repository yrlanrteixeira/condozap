/**
 * Residents Feature - Type Definitions
 */

export type ResidentType = 'OWNER' | 'TENANT'

export interface Resident {
  id: string
  condominiumId: string
  userId?: string | null
  name: string
  phone: string
  tower: string
  floor: string
  unit: string
  type: ResidentType
  consentWhatsapp: boolean
  consentDataProcessing: boolean
  createdAt: string
}

export interface CreateResidentInput {
  id?: string
  condominium_id: string
  name: string
  phone: string
  tower: string
  floor: string
  unit: string
  type: ResidentType
  consent_whatsapp?: boolean
  consent_data_processing?: boolean
}

export interface UpdateResidentInput extends Partial<CreateResidentInput> {
  id: string
}

export interface ImportResidentsInput {
  condominium_id: string
  residents: Omit<CreateResidentInput, 'condominium_id'>[]
}

export interface UpdateConsentInput {
  residentId: string
  consentWhatsapp?: boolean
  consentDataProcessing?: boolean
}

export interface ResidentFilters {
  tower?: string
  floor?: string
  type?: ResidentType
  search?: string
}


