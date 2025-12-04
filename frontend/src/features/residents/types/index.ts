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
  condominiumId: string
  name: string
  phone: string
  tower: string
  floor: string
  unit: string
  type: ResidentType
  consentWhatsapp?: boolean
  consentDataProcessing?: boolean
}

export interface UpdateResidentInput extends Partial<CreateResidentInput> {
  id: string
}

export interface ImportResidentsInput {
  condominiumId: string
  residents: Omit<CreateResidentInput, 'condominiumId'>[]
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


