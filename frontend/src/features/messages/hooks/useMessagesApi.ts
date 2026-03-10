/**
 * Messages Feature - API Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '../utils/queryKeys'
import { MessageSchema } from '../schemas'
import type {
  Message,
  SendMessageInput,
  SendWhatsAppMessageInput,
  SendBulkMessagesInput,
  MessageFilters,
  MessageStatsPeriod,
} from '../types'

// =====================================================
// Query: Fetch Messages History
// =====================================================

export function useMessages(condominiumId: string, filters?: MessageFilters) {
  return useQuery({
    queryKey: queryKeys.list(condominiumId, filters),
    queryFn: async () => {
      const { data } = await api.get(`/messages/${condominiumId}`, {
        params: filters,
      })
      return data.map((message: Message) => MessageSchema.parse(message))
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// =====================================================
// Query: Fetch Single Message
// =====================================================

export function useMessage(messageId: string) {
  return useQuery({
    queryKey: queryKeys.detail(messageId),
    queryFn: async () => {
      const { data } = await api.get(`/messages/detail/${messageId}`)
      return MessageSchema.parse(data)
    },
    enabled: !!messageId,
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
    }: SendWhatsAppMessageInput) => {
      const { data } = await api.post('/whatsapp/send', {
        to,
        message,
        type: 'text',
        condominiumId,
      })
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
      })
    },
  })
}

// =====================================================
// Mutation: Send Bulk Messages
// =====================================================

export function useSendBulkMessages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SendBulkMessagesInput) => {
      const { data } = await api.post('/whatsapp/send-bulk', {
        condominiumId: input.condominiumId,
        recipients: input.recipients,
        message: input.message,
      })
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
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
      const { data } = await api.post('/messages/send', input)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
      })
    },
  })
}

// =====================================================
// Query: Get Message Statistics
// =====================================================

export function useMessageStats(condominiumId: string, period?: MessageStatsPeriod) {
  return useQuery({
    queryKey: queryKeys.stats(condominiumId, period),
    queryFn: async () => {
      const { data } = await api.get('/messages/stats', {
        params: { condominiumId, ...period }
      })
      return data
    },
  })
}


