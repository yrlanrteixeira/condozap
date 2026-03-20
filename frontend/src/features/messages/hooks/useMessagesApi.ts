/**
 * Messages Feature - API Hooks
 */

import { api } from '@/lib/api';
import {
  createQuery,
  createMutationWithInvalidation,
  fetchList,
  fetchOne,
} from '@/shared/hooks/useApiFactory';
import { queryKeys } from '../utils/queryKeys';
import { MessageSchema } from '../schemas';
import type {
  Message,
  SendMessageInput,
  SendWhatsAppMessageInput,
  SendBulkMessagesInput,
  MessageFilters,
  MessageStatsPeriod,
} from '../types';

// =====================================================
// Query: Fetch Messages History
// =====================================================

export const useMessages = createQuery({
  queryKey: (condominiumId: string, filters?: MessageFilters) =>
    queryKeys.list(condominiumId, filters),
  queryFn: (condominiumId: string, filters?: MessageFilters) =>
    fetchList(`/messages/${condominiumId}`, MessageSchema, filters as Record<string, unknown>),
  staleTime: 1000 * 60 * 2,
});

// =====================================================
// Query: Fetch Single Message
// =====================================================

export const useMessage = createQuery({
  queryKey: (messageId: string) => queryKeys.detail(messageId),
  queryFn: (messageId: string) =>
    fetchOne(`/messages/detail/${messageId}`, MessageSchema),
  enabled: (messageId: string) => !!messageId,
});

// =====================================================
// Mutation: Send Single WhatsApp Message
// =====================================================

export const useSendWhatsAppMessage = createMutationWithInvalidation<
  SendWhatsAppMessageInput,
  unknown
>({
  mutationFn: async ({ to, message, condominiumId }) => {
    const { data } = await api.post('/whatsapp/send', {
      to,
      message,
      type: 'text',
      condominiumId,
    });
    return data;
  },
  invalidateKeys: (_, variables) => [queryKeys.list(variables.condominiumId)],
});

// =====================================================
// Mutation: Send Bulk Messages
// =====================================================

export const useSendBulkMessages = createMutationWithInvalidation<
  SendBulkMessagesInput,
  unknown
>({
  mutationFn: async (input) => {
    const { data } = await api.post('/whatsapp/send-bulk', {
      condominiumId: input.condominiumId,
      recipients: input.recipients,
      message: input.message,
    });
    return data;
  },
  invalidateKeys: (_, variables) => [queryKeys.list(variables.condominiumId)],
});

// =====================================================
// Mutation: Send Message with Targeting
// =====================================================

export const useSendMessage = createMutationWithInvalidation<
  SendMessageInput,
  unknown
>({
  mutationFn: async (input) => {
    const { data } = await api.post('/messages/send', input);
    return data;
  },
  invalidateKeys: (_, variables) => [queryKeys.list(variables.condominiumId)],
});

// =====================================================
// Query: Get Message Statistics
// =====================================================

export const useMessageStats = createQuery({
  queryKey: (condominiumId: string, period?: MessageStatsPeriod) =>
    queryKeys.stats(condominiumId, period),
  queryFn: async (condominiumId: string, period?: MessageStatsPeriod) => {
    const { data } = await api.get('/messages/stats', {
      params: { condominiumId, ...period },
    });
    return data;
  },
});
