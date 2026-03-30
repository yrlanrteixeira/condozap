/**
 * Residents Feature - API Hooks
 */

import { api } from '@/lib/api';
import {
  createQuery,
  createMutationWithInvalidation,
  fetchList,
  fetchOne,
  postAndParse,
  patchAndParse,
} from '@/shared/hooks/useApiFactory';
import { queryKeys } from '../utils/queryKeys';
import { ResidentSchema } from '../schemas';
import type {
  Resident,
  CreateResidentInput,
  UpdateResidentInput,
  ImportResidentsInput,
  UpdateConsentInput,
  ResidentFilters,
} from '../types';

// =====================================================
// Query: Fetch Residents
// =====================================================

export const useResidents = createQuery({
  queryKey: (condominiumId: string | 'all', filters?: ResidentFilters) =>
    queryKeys.list(condominiumId, filters),
  queryFn: (condominiumId: string | 'all', filters?: ResidentFilters) => {
    const url =
      condominiumId === 'all' ? '/residents/all' : `/residents/${condominiumId}`;
    return fetchList(url, ResidentSchema, filters as Record<string, unknown>);
  },
  enabled: (condominiumId: string | 'all', _filters?: ResidentFilters) => !!condominiumId,
  staleTime: 1000 * 60 * 5,
});

// =====================================================
// Query: Fetch Single Resident
// =====================================================

export const useResident = createQuery({
  queryKey: (residentId: string) => queryKeys.detail(residentId),
  queryFn: (residentId: string) =>
    fetchOne(`/residents/detail/${residentId}`, ResidentSchema),
  enabled: (residentId: string) => !!residentId,
});

// =====================================================
// Query: Get Towers (Unique)
// =====================================================

export const useTowers = createQuery({
  queryKey: (condominiumId: string) => queryKeys.towers(condominiumId),
  queryFn: async (condominiumId: string): Promise<string[]> => {
    const { data } = await api.get(`/residents/${condominiumId}`);
    const uniqueTowers = [...new Set(data.map((r: any) => r.tower))];
    return uniqueTowers.sort() as string[];
  },
  enabled: (condominiumId: string) => !!condominiumId,
});

// =====================================================
// Mutation: Create Resident
// =====================================================

export const useCreateResident = createMutationWithInvalidation<
  CreateResidentInput,
  Resident
>({
  mutationFn: (input) => postAndParse('/residents', input, ResidentSchema),
  invalidateKeys: (_, variables) => [
    queryKeys.lists(),
    queryKeys.list(variables.condominiumId),
  ],
});

// =====================================================
// Mutation: Update Resident
// =====================================================

export const useUpdateResident = createMutationWithInvalidation<
  UpdateResidentInput,
  Resident
>({
  mutationFn: ({ id, ...input }) =>
    patchAndParse(`/residents/${id}`, input, ResidentSchema),
  invalidateKeys: (data) =>
    data?.id
      ? [queryKeys.lists(), queryKeys.detail(data.id)]
      : [queryKeys.lists()],
});

// =====================================================
// Mutation: Delete Resident
// =====================================================

export const useDeleteResident = createMutationWithInvalidation<string, void>({
  mutationFn: async (residentId) => {
    await api.delete(`/residents/${residentId}`);
  },
  invalidateKeys: () => [queryKeys.lists()],
});

// =====================================================
// Mutation: Import Residents (Bulk)
// =====================================================

export const useImportResidents = createMutationWithInvalidation<
  ImportResidentsInput,
  Resident[]
>({
  mutationFn: async (input) => {
    const { data } = await api.post('/residents/import', input);
    return data.map((resident: Resident) => ResidentSchema.parse(resident));
  },
  invalidateKeys: (_, variables) => [
    queryKeys.lists(),
    queryKeys.list(variables.condominiumId),
  ],
});

// =====================================================
// Mutation: Update Consent
// =====================================================

export const useUpdateConsent = createMutationWithInvalidation<
  UpdateConsentInput,
  Resident
>({
  mutationFn: async ({ residentId, consentWhatsapp, consentDataProcessing }) => {
    const updates: Record<string, boolean> = {};
    if (consentWhatsapp !== undefined) updates.consent_whatsapp = consentWhatsapp;
    if (consentDataProcessing !== undefined)
      updates.consent_data_processing = consentDataProcessing;

    return patchAndParse(`/residents/${residentId}/consent`, updates, ResidentSchema);
  },
  invalidateKeys: (data) =>
    data?.id
      ? [queryKeys.lists(), queryKeys.detail(data.id)]
      : [queryKeys.lists()],
});
