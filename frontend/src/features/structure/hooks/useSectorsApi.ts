import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Sector } from "../types";

export const useSectors = (condominiumId: string) =>
  useQuery({
    queryKey: ["sectors", condominiumId],
    queryFn: async (): Promise<Sector[]> => {
      const { data } = await api.get(`/structure/${condominiumId}/sectors`);
      return data;
    },
    enabled: !!condominiumId,
  });

export const useCreateSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      condominiumId,
      name,
      categories,
    }: {
      condominiumId: string;
      name: string;
      categories: string[];
    }) => {
      const { data } = await api.post(`/structure/${condominiumId}/sectors`, {
        name,
        categories,
      });
      return data as Sector;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["sectors", data.condominiumId],
      });
    },
  });
};

export const useUpdateSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      condominiumId,
      sectorId,
      name,
      categories,
    }: {
      condominiumId: string;
      sectorId: string;
      name?: string;
      categories?: string[];
    }) => {
      const { data } = await api.patch(
        `/structure/${condominiumId}/sectors/${sectorId}`,
        { name, categories }
      );
      return data as Sector;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["sectors", data.condominiumId],
      });
    },
  });
};

export const useSetSectorMembers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      condominiumId,
      sectorId,
      members,
    }: {
      condominiumId: string;
      sectorId: string;
      members: Array<{
        userId: string;
        order?: number;
        workload?: number;
        isActive?: boolean;
      }>;
    }) => {
      const { data } = await api.post(
        `/structure/${condominiumId}/sectors/${sectorId}/members`,
        { members }
      );
      return data as Sector;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["sectors", data.condominiumId],
      });
    },
  });
};

export const useDeleteSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      condominiumId,
      sectorId,
    }: {
      condominiumId: string;
      sectorId: string;
    }) => {
      const { data } = await api.delete(
        `/structure/${condominiumId}/sectors/${sectorId}`
      );
      return data as { message: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sectors", variables.condominiumId],
      });
    },
  });
};

