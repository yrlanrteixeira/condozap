/**
 * Residents Feature - API Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "../utils/queryKeys";
import { ResidentSchema } from "../schemas";
import type {
  Resident,
  CreateResidentInput,
  UpdateResidentInput,
  ImportResidentsInput,
  UpdateConsentInput,
  ResidentFilters,
} from "../types";

// =====================================================
// Query: Fetch Residents
// =====================================================

export function useResidents(
  condominiumId: string | "all",
  filters?: ResidentFilters
) {
  return useQuery({
    queryKey: queryKeys.list(condominiumId, filters),
    queryFn: async () => {
      const url =
        condominiumId === "all"
          ? "/residents/all"
          : `/residents/${condominiumId}`;
      const { data } = await api.get(url, {
        params: filters, // Filters as query params (tower, floor, type, search)
      });
      return data.map((resident: Resident) => ResidentSchema.parse(resident));
    },
    enabled: !!condominiumId, // Only fetch when condominiumId is provided
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =====================================================
// Query: Fetch Single Resident
// =====================================================

export function useResident(residentId: string) {
  return useQuery({
    queryKey: queryKeys.detail(residentId),
    queryFn: async () => {
      const { data } = await api.get(`/residents/${residentId}`);
      return ResidentSchema.parse(data);
    },
  });
}

// =====================================================
// Query: Get Towers (Unique)
// =====================================================

export function useTowers(condominiumId: string) {
  return useQuery<string[]>({
    queryKey: queryKeys.towers(condominiumId),
    queryFn: async () => {
      // TODO: Backend doesn't have this endpoint yet
      // Get unique towers from residents
      const { data } = await api.get(`/residents/${condominiumId}`);
      const uniqueTowers = [...new Set(data.map((r: any) => r.tower))];
      return uniqueTowers.sort() as string[];
    },
    enabled: !!condominiumId,
  });
}

// =====================================================
// Mutation: Create Resident
// =====================================================

export function useCreateResident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateResidentInput) => {
      const { data } = await api.post("/residents", input);
      return ResidentSchema.parse(data);
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
// Mutation: Update Resident
// =====================================================

export function useUpdateResident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateResidentInput) => {
      const { data } = await api.patch(`/residents/${id}`, input);
      return ResidentSchema.parse(data);
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
// Mutation: Delete Resident
// =====================================================

export function useDeleteResident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (residentId: string) => {
      await api.delete(`/residents/${residentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists(),
      });
    },
  });
}

// =====================================================
// Mutation: Import Residents (Bulk)
// =====================================================

export function useImportResidents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ImportResidentsInput) => {
      // TODO: Backend doesn't have this endpoint yet
      // For now, create residents one by one
      console.warn("Bulk import not implemented yet - creating individually");
      const { data } = await api.post("/residents/import", input);
      return data.map((resident: Resident) => ResidentSchema.parse(resident));
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
// Mutation: Update Consent
// =====================================================

export function useUpdateConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      residentId,
      consentWhatsapp,
      consentDataProcessing,
    }: UpdateConsentInput) => {
      const updates: Record<string, boolean> = {};
      if (consentWhatsapp !== undefined)
        updates.consent_whatsapp = consentWhatsapp;
      if (consentDataProcessing !== undefined)
        updates.consent_data_processing = consentDataProcessing;

      const { data } = await api.patch(
        `/residents/${residentId}/consent`,
        updates
      );
      return ResidentSchema.parse(data);
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
