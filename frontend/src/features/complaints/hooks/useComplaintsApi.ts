/**
 * Complaints Feature - API Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "../utils/queryKeys";
import { ComplaintSchema } from "../schemas";
import type {
  Complaint,
  CreateComplaintInput,
  UpdateComplaintInput,
  ComplaintFilters,
} from "../types";

// =====================================================
// Query: Fetch Complaints
// =====================================================

export function useComplaints(
  condominiumId: string,
  filters?: ComplaintFilters
) {
  const isGlobal = condominiumId === 'all';
  const endpoint = isGlobal ? '/complaints/all' : `/complaints/${condominiumId}`;

  return useQuery({
    queryKey: queryKeys.list(condominiumId, filters),
    queryFn: async () => {
      const { data } = isGlobal
        ? await api.get(endpoint, { params: filters })
        : await api.get(endpoint, { params: filters });
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
    queryFn: async () => {
      const { data } = await api.get(`/complaints/${complaintId}`);
      return ComplaintSchema.parse(data);
    },
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
        queryKey: queryKeys.list(variables.condominium_id),
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
      status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
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
