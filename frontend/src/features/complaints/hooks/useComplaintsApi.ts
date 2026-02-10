/**
 * Complaints Feature - API Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "../utils/queryKeys";
import { ComplaintSchema, ComplaintDetailSchema } from "../schemas";
import type {
  Complaint,
  ComplaintDetail,
  CreateComplaintInput,
  UpdateComplaintInput,
  ComplaintFilters,
  ComplaintStatus,
} from "../types";

// =====================================================
// Query: Fetch Complaints
// =====================================================

export function useComplaints(
  condominiumId: string,
  filters?: ComplaintFilters
) {
  const endpoint = `/complaints/${condominiumId}`;

  return useQuery({
    queryKey: queryKeys.list(condominiumId, filters),
    queryFn: async () => {
      const { data } = await api.get(endpoint, { params: filters });
      return data.map((complaint: Complaint) =>
        ComplaintSchema.parse(complaint)
      );
    },
    enabled: !!condominiumId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// =====================================================
// Query: Fetch Single Complaint
// =====================================================

export function useComplaint(complaintId: number) {
  return useQuery({
    queryKey: queryKeys.detail(complaintId),
    queryFn: async (): Promise<ComplaintDetail> => {
      const { data } = await api.get(`/complaints/detail/${complaintId}`);
      return ComplaintDetailSchema.parse(data) as ComplaintDetail;
    },
    enabled: complaintId > 0,
  });
}

// =====================================================
// Mutation: Create Complaint
// =====================================================

export function useCreateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateComplaintInput) => {
      const { data } = await api.post("/complaints", input);
      return ComplaintSchema.parse(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.list(variables.condominiumId),
      });
    },
  });
}

// =====================================================
// Mutation: Update Complaint
// =====================================================

export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateComplaintInput) => {
      const { data } = await api.put(`/complaints/${id}`, input);
      return ComplaintSchema.parse(data);
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.lists(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.detail(data.id),
        });
      }
    },
  });
}

// =====================================================
// Mutation: Update Complaint Status (com notificação WhatsApp)
// =====================================================

export function useUpdateComplaintStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: number;
      status: ComplaintStatus;
      notes?: string;
    }) => {
      const { data } = await api.patch(`/complaints/${id}/status`, {
        status,
        notes,
      });
      return ComplaintSchema.parse(data);
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.id) });
      }
    },
  });
}

// =====================================================
// Mutation: Update Complaint Priority (com notificação WhatsApp)
// =====================================================

export function useUpdateComplaintPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      priority,
    }: {
      id: number;
      priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    }) => {
      const { data } = await api.patch(`/complaints/${id}/priority`, {
        priority,
      });
      return ComplaintSchema.parse(data);
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.id) });
      }
    },
  });
}

// =====================================================
// Mutation: Add Comment to Complaint (com notificação WhatsApp)
// =====================================================

export function useAddComplaintComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const { data } = await api.post(`/complaints/${id}/comment`, { notes });
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalida as queries para recarregar os dados atualizados
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.detail(variables.id),
      });
    },
  });
}

// =====================================================
// Mutation: Assign Complaint to Sector/Assignee
// =====================================================

export function useAssignComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      sectorId,
      assigneeId,
      reason,
    }: {
      id: number;
      sectorId: string;
      assigneeId?: string;
      reason?: string;
    }) => {
      const { data } = await api.post(`/complaints/${id}/assign`, {
        sectorId,
        assigneeId,
        reason,
      });
      return ComplaintSchema.parse(data);
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.id) });
      }
    },
  });
}

// =====================================================
// Mutation: Pause SLA
// =====================================================

export function usePauseComplaintSla() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
      pausedUntil,
    }: {
      id: number;
      status: "WAITING_USER" | "WAITING_THIRD_PARTY";
      reason: string;
      pausedUntil?: string;
    }) => {
      const { data } = await api.post(`/complaints/${id}/pause`, {
        status,
        reason,
        pausedUntil,
      });
      return ComplaintSchema.parse(data);
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.id) });
      }
    },
  });
}

// =====================================================
// Mutation: Resume SLA
// =====================================================

export function useResumeComplaintSla() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const { data } = await api.post(`/complaints/${id}/resume`, { notes });
      return ComplaintSchema.parse(data);
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.id) });
      }
    },
  });
}

// =====================================================
// Mutation: Add Attachment
// =====================================================

export function useAddComplaintAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      fileUrl,
      fileName,
      fileType,
      fileSize,
    }: {
      id: number;
      fileUrl: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }) => {
      const { data } = await api.post(`/complaints/${id}/attachments`, {
        fileUrl,
        fileName,
        fileType,
        fileSize,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
    },
  });
}

// =====================================================
// Mutation: Run SLA Scan (admin)
// =====================================================

export function useRunSlaScan() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/complaints/sla/scan");
      return data;
    },
  });
}

// =====================================================
// Mutation: Delete Complaint
// =====================================================

export function useDeleteComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (complaintId: number) => {
      await api.delete(`/complaints/${complaintId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists(),
      });
    },
  });
}

// =====================================================
// Query: Get Complaint Statistics
// =====================================================

export function useComplaintStats(condominiumId: string) {
  return useQuery({
    queryKey: queryKeys.stats(condominiumId),
    queryFn: async () => {
      const { data } = await api.get("/complaints/stats", {
        params: { condominiumId },
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
