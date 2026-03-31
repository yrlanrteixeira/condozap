/**
 * Structure Feature - API Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface TowerStructure {
  name: string;
  floors: string[];
  unitsPerFloor: number;
}

export interface CondominiumStructure {
  towers: TowerStructure[];
}

export interface StructureResponse {
  condominiumId: string;
  condominiumName: string;
  structure: CondominiumStructure;
}

// =====================================================
// Query: Get Structure
// =====================================================

export function useStructure(condominiumId: string) {
  return useQuery({
    queryKey: ["structure", condominiumId],
    queryFn: async () => {
      const { data } = await api.get<StructureResponse>(
        `/structure/${condominiumId}`
      );
      return data;
    },
    enabled: !!condominiumId,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

// =====================================================
// Mutation: Update Structure
// =====================================================

export function useUpdateStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      condominiumId,
      structure,
    }: {
      condominiumId: string;
      structure: CondominiumStructure;
    }) => {
      const { data } = await api.patch<StructureResponse>(
        `/structure/${condominiumId}`,
        { structure }
      );
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: ["structure", data.condominiumId],
      });
      await queryClient.refetchQueries({
        queryKey: ["structure", data.condominiumId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["residents"],
      });
    },
  });
}

