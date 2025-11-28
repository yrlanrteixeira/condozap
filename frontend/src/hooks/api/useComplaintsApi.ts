/**
 * React Query hooks for Complaints API
 * Integrates with Supabase Edge Functions and database
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryClient'
import type { Complaint, ComplaintStatus, ComplaintPriority } from '@/types'
import { ComplaintSchema } from '@/schemas'

// =====================================================
// Types
// =====================================================

interface CreateComplaintInput {
  condominium_id: string
  resident_id: string
  category: string
  content: string
  priority?: ComplaintPriority
  is_anonymous?: boolean
  attachments?: File[]
}

interface UpdateComplaintStatusInput {
  complaintId: number
  status: ComplaintStatus
  notes?: string
}

interface UpdateComplaintPriorityInput {
  complaintId: number
  priority: ComplaintPriority
}

// =====================================================
// Query: Fetch Complaints
// =====================================================

export function useComplaints(condominiumId: string, filters?: {
  status?: ComplaintStatus
  priority?: ComplaintPriority
  category?: string
}) {
  return useQuery({
    queryKey: queryKeys.complaints.list(condominiumId, filters),
    queryFn: async () => {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          resident:residents(id, name, phone, tower, floor, unit),
          attachments:complaint_attachments(*),
          statusHistory:complaint_status_history(*)
        `)
        .eq('condominium_id', condominiumId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch complaints: ${error.message}`)
      }

      // Validate with Zod
      return data.map(complaint => ComplaintSchema.parse(complaint))
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =====================================================
// Query: Fetch Single Complaint
// =====================================================

export function useComplaint(complaintId: number) {
  return useQuery({
    queryKey: queryKeys.complaints.detail(complaintId.toString()),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          resident:residents(*),
          attachments:complaint_attachments(*),
          statusHistory:complaint_status_history(*)
        `)
        .eq('id', complaintId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch complaint: ${error.message}`)
      }

      return ComplaintSchema.parse(data)
    },
  })
}

// =====================================================
// Mutation: Create Complaint (via Edge Function)
// =====================================================

export function useCreateComplaint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateComplaintInput) => {
      // Call Edge Function to create complaint and send auto-notification
      const { data, error } = await supabase.functions.invoke('create-complaint', {
        body: {
          condominium_id: input.condominium_id,
          resident_id: input.resident_id,
          category: input.category,
          content: input.content,
          priority: input.priority || 'MEDIUM',
          is_anonymous: input.is_anonymous || false,
        },
      })

      if (error) {
        throw new Error(`Failed to create complaint: ${error.message}`)
      }

      // If attachments, upload them
      if (input.attachments && input.attachments.length > 0) {
        const complaintId = data.complaint.id
        await uploadComplaintAttachments(complaintId, input.attachments)
      }

      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate complaints list for this condominium
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.list(variables.condominium_id),
      })
    },
  })
}

// =====================================================
// Mutation: Update Complaint Status (via Edge Function)
// =====================================================

export function useUpdateComplaintStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateComplaintStatusInput) => {
      // Call Edge Function to update status and send notification
      const { data, error } = await supabase.functions.invoke('update-complaint-status', {
        body: {
          complaint_id: input.complaintId,
          new_status: input.status,
          notes: input.notes,
        },
      })

      if (error) {
        throw new Error(`Failed to update complaint status: ${error.message}`)
      }

      return data
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.detail(data.complaint.id.toString()),
      })
    },
  })
}

// =====================================================
// Mutation: Update Complaint Priority
// =====================================================

export function useUpdateComplaintPriority() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateComplaintPriorityInput) => {
      const { data, error } = await supabase
        .from('complaints')
        .update({ priority: input.priority })
        .eq('id', input.complaintId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update complaint priority: ${error.message}`)
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.detail(data.id.toString()),
      })
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
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', complaintId)

      if (error) {
        throw new Error(`Failed to delete complaint: ${error.message}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.complaints.lists(),
      })
    },
  })
}

// =====================================================
// Helper: Upload Complaint Attachments
// =====================================================

async function uploadComplaintAttachments(complaintId: number, files: File[]) {
  const uploadPromises = files.map(async (file) => {
    // Generate unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${complaintId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('complaint-attachments')
      .upload(fileName, file)

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('complaint-attachments')
      .getPublicUrl(fileName)

    // Create attachment record
    const { error: insertError } = await supabase
      .from('complaint_attachments')
      .insert({
        complaint_id: complaintId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      })

    if (insertError) {
      throw new Error(`Failed to create attachment record: ${insertError.message}`)
    }
  })

  await Promise.all(uploadPromises)
}
