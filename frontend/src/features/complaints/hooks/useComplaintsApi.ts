/**
 * Complaints Feature - API Hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  createQuery,
  createMutationWithInvalidation,
  fetchList,
  fetchOne,
  postAndParse,
} from '@/shared/hooks/useApiFactory';
import { queryKeys } from '../utils/queryKeys';
import { ComplaintSchema, ComplaintDetailSchema } from '../schemas';
import type {
  Complaint,
  ComplaintDetail,
  CreateComplaintInput,
  UpdateComplaintInput,
  ComplaintFilters,
  ComplaintStatus,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard invalidation for mutations that return a complaint with an id */
const invalidateListAndDetail = (data: Complaint) =>
  data?.id
    ? [queryKeys.lists(), queryKeys.detail(data.id)]
    : [queryKeys.lists()];

// =====================================================
// Query: Fetch Complaints
// =====================================================

export const useComplaints = createQuery({
  queryKey: (condominiumId: string, filters?: ComplaintFilters) =>
    queryKeys.list(condominiumId, filters),
  queryFn: (condominiumId: string, filters?: ComplaintFilters) =>
    fetchList(`/complaints/${condominiumId}`, ComplaintSchema, filters as Record<string, unknown>),
  enabled: (condominiumId: string) => !!condominiumId,
  staleTime: 1000 * 60 * 2,
});

// =====================================================
// Query: Fetch Complaints (paginated)
// =====================================================
// Backend retorna envelope { data, total, page, pageSize } quando `page` é
// informado. Hook destinado a telas que aderirem à paginação server-side.
export interface PaginatedComplaints {
  data: Complaint[];
  total: number;
  page: number;
  pageSize: number;
}

export const useComplaintsPaginated = createQuery({
  queryKey: (
    condominiumId: string,
    page: number,
    pageSize: number,
    filters?: Omit<ComplaintFilters, 'page' | 'pageSize'>,
  ) => [...queryKeys.list(condominiumId, filters as ComplaintFilters), 'page', page, pageSize] as const,
  queryFn: async (
    condominiumId: string,
    page: number,
    pageSize: number,
    filters?: Omit<ComplaintFilters, 'page' | 'pageSize'>,
  ): Promise<PaginatedComplaints> => {
    const { data } = await api.get(`/complaints/${condominiumId}`, {
      params: { ...(filters as Record<string, unknown> | undefined), page, pageSize },
    });
    return {
      data: data.data.map((item: unknown) => ComplaintSchema.parse(item)),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    };
  },
  enabled: (condominiumId: string) => !!condominiumId,
  staleTime: 1000 * 60 * 2,
});

// =====================================================
// Query: Fetch Single Complaint
// =====================================================

export const useComplaint = createQuery({
  queryKey: (complaintId: number) => queryKeys.detail(complaintId),
  queryFn: async (complaintId: number): Promise<ComplaintDetail> => {
    const { data } = await api.get(`/complaints/detail/${complaintId}`);
    return ComplaintDetailSchema.parse(data) as ComplaintDetail;
  },
  enabled: (complaintId: number) => complaintId > 0,
});

// =====================================================
// Mutation: Create Complaint
// =====================================================

export const useCreateComplaint = createMutationWithInvalidation<
  CreateComplaintInput,
  Complaint
>({
  mutationFn: (input) => postAndParse('/complaints', input, ComplaintSchema),
  invalidateKeys: (_, variables) => [
    queryKeys.lists(),
    queryKeys.list(variables.condominiumId),
  ],
});

// =====================================================
// Mutation: Update Complaint
// =====================================================

export const useUpdateComplaint = createMutationWithInvalidation<
  UpdateComplaintInput,
  Complaint
>({
  mutationFn: async ({ id, ...input }) => {
    const { data } = await api.put(`/complaints/${id}`, input);
    return ComplaintSchema.parse(data);
  },
  invalidateKeys: invalidateListAndDetail,
});

// =====================================================
// Mutation: Update Complaint Status (com notificacao WhatsApp)
// =====================================================

export const useUpdateComplaintStatus = createMutationWithInvalidation<
  { id: number; status: ComplaintStatus; notes?: string },
  Complaint
>({
  mutationFn: async ({ id, status, notes }) => {
    const { data } = await api.patch(`/complaints/${id}/status`, { status, notes });
    return ComplaintSchema.parse(data);
  },
  invalidateKeys: invalidateListAndDetail,
});

// =====================================================
// Mutation: Update Complaint Priority (com notificacao WhatsApp)
// =====================================================

export const useUpdateComplaintPriority = createMutationWithInvalidation<
  { id: number; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' },
  Complaint
>({
  mutationFn: async ({ id, priority }) => {
    const { data } = await api.patch(`/complaints/${id}/priority`, { priority });
    return ComplaintSchema.parse(data);
  },
  invalidateKeys: invalidateListAndDetail,
});

// =====================================================
// Mutation: Add Comment to Complaint (com notificacao WhatsApp)
// =====================================================

export const useAddComplaintComment = createMutationWithInvalidation<
  { id: number; notes: string },
  unknown
>({
  mutationFn: async ({ id, notes }) => {
    const { data } = await api.post(`/complaints/${id}/comment`, { notes });
    return data;
  },
  invalidateKeys: (_, variables) => [
    queryKeys.lists(),
    queryKeys.detail(variables.id),
  ],
});

// =====================================================
// Mutation: Assign Complaint to Sector/Assignee
// =====================================================

export const useAssignComplaint = createMutationWithInvalidation<
  { id: number; sectorId: string; assigneeId?: string; reason?: string },
  Complaint
>({
  mutationFn: async ({ id, sectorId, assigneeId, reason }) => {
    const { data } = await api.post(`/complaints/${id}/assign`, {
      sectorId,
      assigneeId,
      reason,
    });
    return ComplaintSchema.parse(data);
  },
  invalidateKeys: invalidateListAndDetail,
});

// =====================================================
// Mutation: Pause SLA
// =====================================================

export const usePauseComplaintSla = createMutationWithInvalidation<
  {
    id: number;
    status: 'WAITING_USER' | 'WAITING_THIRD_PARTY';
    reason: string;
    pausedUntil?: string;
  },
  Complaint
>({
  mutationFn: async ({ id, status, reason, pausedUntil }) => {
    const { data } = await api.post(`/complaints/${id}/pause`, {
      status,
      reason,
      pausedUntil,
    });
    return ComplaintSchema.parse(data);
  },
  invalidateKeys: invalidateListAndDetail,
});

// =====================================================
// Mutation: Resume SLA
// =====================================================

export const useResumeComplaintSla = createMutationWithInvalidation<
  { id: number; notes?: string },
  Complaint
>({
  mutationFn: async ({ id, notes }) => {
    const { data } = await api.post(`/complaints/${id}/resume`, { notes });
    return ComplaintSchema.parse(data);
  },
  invalidateKeys: invalidateListAndDetail,
});

// =====================================================
// Mutation: Add Attachment
// =====================================================

export const useAddComplaintAttachment = createMutationWithInvalidation<
  {
    id: number;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  },
  unknown
>({
  mutationFn: async ({ id, fileUrl, fileName, fileType, fileSize }) => {
    const { data } = await api.post(`/complaints/${id}/attachments`, {
      fileUrl,
      fileName,
      fileType,
      fileSize,
    });
    return data;
  },
  invalidateKeys: (_, variables) => [queryKeys.detail(variables.id)],
});

// =====================================================
// Mutation: Run SLA Scan (admin)
// =====================================================

export function useRunSlaScan() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/complaints/sla/scan');
      return data;
    },
  });
}

// =====================================================
// Mutation: Delete Complaint
// =====================================================

export const useDeleteComplaint = createMutationWithInvalidation<number, void>({
  mutationFn: async (complaintId) => {
    await api.delete(`/complaints/${complaintId}`);
  },
  invalidateKeys: () => [queryKeys.lists()],
});

// =====================================================
// Mutation: Nudge Sector (cobrar posicionamento)
// =====================================================

export function useNudgeComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (complaintId: number) => {
      const { data } = await api.post(`/complaints/${complaintId}/nudge`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
    },
  });
}

// =====================================================
// Query: Get Complaint Statistics
// =====================================================

export const useComplaintStats = createQuery({
  queryKey: (condominiumId: string) => queryKeys.stats(condominiumId),
  queryFn: async (condominiumId: string) => {
    const { data } = await api.get('/complaints/stats', {
      params: { condominiumId },
    });
    return data;
  },
  staleTime: 1000 * 60 * 5,
});
