/**
 * React Query hooks for Messages API
 * Integrates with Supabase Edge Functions for WhatsApp
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryClient'
import type { Message, MessageScope, MessageType, Resident } from '@/types'
import { MessageSchema } from '@/schemas'

// =====================================================
// Types
// =====================================================

interface SendMessageInput {
  condominium_id: string
  type: MessageType
  scope: MessageScope
  target_tower?: string
  target_floor?: string
  target_unit?: string
  content: string
  sent_by: string
}

interface SendBulkMessagesInput {
  condominium_id: string
  recipients: Resident[]
  message: string
}

// =====================================================
// Query: Fetch Messages History
// =====================================================

export function useMessages(condominiumId: string, filters?: {
  type?: MessageType
  scope?: MessageScope
  sentBy?: string
  limit?: number
}) {
  return useQuery({
    queryKey: queryKeys.messages.list(condominiumId, filters),
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('condominium_id', condominiumId)
        .order('sent_at', { ascending: false })

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.scope) {
        query = query.eq('scope', filters.scope)
      }
      if (filters?.sentBy) {
        query = query.eq('sent_by', filters.sentBy)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`)
      }

      // Validate with Zod
      return data.map(message => MessageSchema.parse(message))
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// =====================================================
// Query: Fetch Single Message
// =====================================================

export function useMessage(messageId: string) {
  return useQuery({
    queryKey: queryKeys.messages.detail(messageId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch message: ${error.message}`)
      }

      return MessageSchema.parse(data)
    },
  })
}

// =====================================================
// Mutation: Send Single WhatsApp Message
// =====================================================

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      to,
      message,
      condominiumId,
    }: {
      to: string
      message: string
      condominiumId: string
    }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to,
          message,
          type: 'text',
          condominium_id: condominiumId,
        },
      })

      if (error) {
        throw new Error(`Failed to send WhatsApp message: ${error.message}`)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(variables.condominiumId),
      })
    },
  })
}

// =====================================================
// Mutation: Send Bulk Messages (via Edge Function)
// =====================================================

export function useSendBulkMessages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SendBulkMessagesInput) => {
      // Call Edge Function to send bulk messages with rate limiting
      const { data, error } = await supabase.functions.invoke('send-bulk-messages', {
        body: {
          condominium_id: input.condominium_id,
          recipients: input.recipients.map(r => ({
            phone: r.phone,
            name: r.name,
          })),
          message: input.message,
        },
      })

      if (error) {
        throw new Error(`Failed to send bulk messages: ${error.message}`)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(variables.condominium_id),
      })
    },
  })
}

// =====================================================
// Mutation: Send Message with Targeting
// =====================================================

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      // First, get targeted residents based on scope
      const recipients = await getTargetedResidents(
        input.condominium_id,
        input.scope,
        input.target_tower,
        input.target_floor,
        input.target_unit
      )

      if (recipients.length === 0) {
        throw new Error('No recipients found for the specified scope')
      }

      // Send bulk messages via Edge Function
      const { data, error } = await supabase.functions.invoke('send-bulk-messages', {
        body: {
          condominium_id: input.condominium_id,
          recipients: recipients.map(r => ({
            phone: r.phone,
            name: r.name,
          })),
          message: input.content,
        },
      })

      if (error) {
        throw new Error(`Failed to send message: ${error.message}`)
      }

      // Create message log
      await supabase.from('messages').insert({
        condominium_id: input.condominium_id,
        type: input.type,
        scope: input.scope,
        target_tower: input.target_tower,
        target_floor: input.target_floor,
        target_unit: input.target_unit,
        content: input.content,
        recipient_count: recipients.length,
        whatsapp_status: 'SENT',
        sent_by: input.sent_by,
      })

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(variables.condominium_id),
      })
    },
  })
}

// =====================================================
// Helper: Get Targeted Residents
// =====================================================

async function getTargetedResidents(
  condominiumId: string,
  scope: MessageScope,
  targetTower?: string,
  targetFloor?: string,
  targetUnit?: string
): Promise<Resident[]> {
  let query = supabase
    .from('residents')
    .select('*')
    .eq('condominium_id', condominiumId)
    .eq('consent_whatsapp', true) // LGPD: only send to those who consented

  switch (scope) {
    case 'ALL':
      // No additional filters
      break
    case 'TOWER':
      if (!targetTower) throw new Error('target_tower is required for TOWER scope')
      query = query.eq('tower', targetTower)
      break
    case 'FLOOR':
      if (!targetTower || !targetFloor) {
        throw new Error('target_tower and target_floor are required for FLOOR scope')
      }
      query = query.eq('tower', targetTower).eq('floor', targetFloor)
      break
    case 'UNIT':
      if (!targetTower || !targetFloor || !targetUnit) {
        throw new Error('target_tower, target_floor, and target_unit are required for UNIT scope')
      }
      query = query
        .eq('tower', targetTower)
        .eq('floor', targetFloor)
        .eq('unit', targetUnit)
      break
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch targeted residents: ${error.message}`)
  }

  return data
}

// =====================================================
// Query: Get Message Statistics
// =====================================================

export function useMessageStats(condominiumId: string, period?: {
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ['messageStats', condominiumId, period],
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('whatsapp_status, recipient_count')
        .eq('condominium_id', condominiumId)

      if (period?.startDate) {
        query = query.gte('sent_at', period.startDate)
      }
      if (period?.endDate) {
        query = query.lte('sent_at', period.endDate)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch message stats: ${error.message}`)
      }

      // Calculate statistics
      const totalMessages = data.length
      const totalRecipients = data.reduce((sum, msg) => sum + (msg.recipient_count || 0), 0)
      const deliveredCount = data.filter(msg => msg.whatsapp_status === 'DELIVERED').length
      const readCount = data.filter(msg => msg.whatsapp_status === 'READ').length
      const failedCount = data.filter(msg => msg.whatsapp_status === 'FAILED').length

      return {
        totalMessages,
        totalRecipients,
        deliveredCount,
        readCount,
        failedCount,
        deliveryRate: totalMessages > 0 ? (deliveredCount / totalMessages) * 100 : 0,
        readRate: totalMessages > 0 ? (readCount / totalMessages) * 100 : 0,
      }
    },
  })
}
