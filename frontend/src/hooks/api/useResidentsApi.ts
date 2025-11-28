/**
 * React Query hooks for Residents API
 * Integrates with Supabase database
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryClient'
import type { Resident, ResidentType } from '@/types'
import { ResidentSchema } from '@/schemas'

// =====================================================
// Types
// =====================================================

interface CreateResidentInput {
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

interface UpdateResidentInput extends Partial<CreateResidentInput> {
  id: string
}

interface ImportResidentsInput {
  condominium_id: string
  residents: Omit<CreateResidentInput, 'condominium_id'>[]
}

// =====================================================
// Query: Fetch Residents
// =====================================================

export function useResidents(condominiumId: string, filters?: {
  tower?: string
  floor?: string
  type?: ResidentType
  search?: string
}) {
  return useQuery({
    queryKey: queryKeys.residents.list(condominiumId, filters),
    queryFn: async () => {
      let query = supabase
        .from('residents')
        .select('*')
        .eq('condominium_id', condominiumId)
        .order('tower')
        .order('floor')
        .order('unit')

      // Apply filters
      if (filters?.tower) {
        query = query.eq('tower', filters.tower)
      }
      if (filters?.floor) {
        query = query.eq('floor', filters.floor)
      }
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch residents: ${error.message}`)
      }

      // Validate with Zod
      return data.map(resident => ResidentSchema.parse(resident))
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =====================================================
// Query: Fetch Single Resident
// =====================================================

export function useResident(residentId: string) {
  return useQuery({
    queryKey: queryKeys.residents.detail(residentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', residentId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch resident: ${error.message}`)
      }

      return ResidentSchema.parse(data)
    },
  })
}

// =====================================================
// Query: Get Towers (Unique)
// =====================================================

export function useTowers(condominiumId: string) {
  return useQuery({
    queryKey: ['towers', condominiumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('residents')
        .select('tower')
        .eq('condominium_id', condominiumId)

      if (error) {
        throw new Error(`Failed to fetch towers: ${error.message}`)
      }

      // Return unique towers
      return [...new Set(data.map(r => r.tower))].sort()
    },
  })
}

// =====================================================
// Mutation: Create Resident
// =====================================================

export function useCreateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateResidentInput) => {
      const { data, error } = await supabase
        .from('residents')
        .insert({
          condominium_id: input.condominium_id,
          name: input.name,
          phone: input.phone,
          tower: input.tower,
          floor: input.floor,
          unit: input.unit,
          type: input.type,
          consent_whatsapp: input.consent_whatsapp ?? false,
          consent_data_processing: input.consent_data_processing ?? false,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create resident: ${error.message}`)
      }

      return ResidentSchema.parse(data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.list(variables.condominium_id),
      })
    },
  })
}

// =====================================================
// Mutation: Update Resident
// =====================================================

export function useUpdateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateResidentInput) => {
      const { data, error } = await supabase
        .from('residents')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update resident: ${error.message}`)
      }

      return ResidentSchema.parse(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.detail(data.id),
      })
    },
  })
}

// =====================================================
// Mutation: Delete Resident
// =====================================================

export function useDeleteResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (residentId: string) => {
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', residentId)

      if (error) {
        throw new Error(`Failed to delete resident: ${error.message}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.lists(),
      })
    },
  })
}

// =====================================================
// Mutation: Import Residents (Bulk)
// =====================================================

export function useImportResidents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ImportResidentsInput) => {
      const residentsToInsert = input.residents.map(r => ({
        condominium_id: input.condominium_id,
        name: r.name,
        phone: r.phone,
        tower: r.tower,
        floor: r.floor,
        unit: r.unit,
        type: r.type,
        consent_whatsapp: r.consent_whatsapp ?? false,
        consent_data_processing: r.consent_data_processing ?? false,
      }))

      const { data, error } = await supabase
        .from('residents')
        .insert(residentsToInsert)
        .select()

      if (error) {
        throw new Error(`Failed to import residents: ${error.message}`)
      }

      return data.map(resident => ResidentSchema.parse(resident))
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.list(variables.condominium_id),
      })
    },
  })
}

// =====================================================
// Mutation: Update Consent
// =====================================================

export function useUpdateConsent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      residentId,
      consentWhatsapp,
      consentDataProcessing,
    }: {
      residentId: string
      consentWhatsapp?: boolean
      consentDataProcessing?: boolean
    }) => {
      const updates: Record<string, boolean> = {}
      if (consentWhatsapp !== undefined) updates.consent_whatsapp = consentWhatsapp
      if (consentDataProcessing !== undefined) updates.consent_data_processing = consentDataProcessing

      const { data, error } = await supabase
        .from('residents')
        .update(updates)
        .eq('id', residentId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update consent: ${error.message}`)
      }

      return ResidentSchema.parse(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.residents.detail(data.id),
      })
    },
  })
}
