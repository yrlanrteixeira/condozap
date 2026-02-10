/**
 * Announcements (Novidades) API hooks
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Announcement } from "../types";

const queryKeys = {
  all: ["announcements"] as const,
  list: (condominiumId: string) =>
    [...queryKeys.all, "list", condominiumId] as const,
};

/**
 * Lista novidades ativas da semana para o condomínio (para morador e admin).
 */
export function useAnnouncements(condominiumId: string) {
  return useQuery({
    queryKey: queryKeys.list(condominiumId),
    queryFn: async (): Promise<Announcement[]> => {
      const { data } = await api.get(
        `/condominiums/${condominiumId}/announcements`
      );
      return data ?? [];
    },
    enabled: !!condominiumId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
