/**
 * Complaints Feature - API Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '../utils/queryKeys'
import { ComplaintSchema } from '../schemas'
import type {
  Complaint,
  CreateComplaintInput,
  UpdateComplaintInput,
  ComplaintFilters,
} from '../types'

// =====================================================
// Query: Fetch Complaints
// =====================================================

export function useComplaints(condominiumId: string, filters?: ComplaintFilters) {
  return useQuery({
    queryKey: queryKeys.list(condominiumId, filters),
    queryFn: async () => {
      const { data } = await api.get('/complaints', {
        params: { condominiumId, ...filters }
      })
      return data.map((complaint: Complaint) => ComplaintSchema.parse(complaint))
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// =====================================================
// Query: Fetch Single Complaint
// =====================================================

export function useComplaint(complaintId: number) {
  return useQuery({
    queryKey: queryKeys.detail(complaintId),
    queryFn: async () => {
      const { data } = await api.get(`/complaints/${complaintId}`)
      return ComplaintSchema.parse(data)
    },
  })
}

// =====================================================
// Mutation: Create Complaint
// =====================================================

export function useCreateComplaint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateComplaintInput) => {
      const { data } = await api.post('/complaints', input)
      return ComplaintSchema.parse(data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominium_id),
      })
    },
  })
}

// =====================================================
// Mutation: Update Complaint
// =====================================================

export function useUpdateComplaint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateComplaintInput) => {
      const { data } = await api.put(`/complaints/${id}`, input)
      return ComplaintSchema.parse(data)
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.lists(),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.detail(data.id),
        })
      }
    },
  })
}

// =====================================================
// Mutation: Delete Complaint
// =====================================================

export function useDeleteComplaint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (complaintId: number) => {
      await api.delete(`/complaints/${complaintId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists(),
      })
    },
  })
}

// =====================================================
// Query: Get Complaint Statistics
// =====================================================

export function useComplaintStats(condominiumId: string) {
  return useQuery({
    queryKey: queryKeys.stats(condominiumId),
    queryFn: async () => {
      const { data } = await api.get('/complaints/stats', {
        params: { condominiumId }
      })
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}


