/**
 * Announcements API hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  scope: string;
  targetTower: string | null;
  targetFloor: string | null;
  targetUnit: string | null;
  sendWhatsApp: boolean;
  authorName: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export type { Announcement };

export function useAnnouncements(condominiumId: string, active = true) {
  return useQuery<{ announcements: Announcement[] }>({
    queryKey: ["announcements", condominiumId, active],
    queryFn: async () => {
      const { data } = await api.get(`/announcements/${condominiumId}`, {
        params: { active: String(active) },
      });
      return data;
    },
    enabled: !!condominiumId,
  });
}

interface CreateAnnouncementInput {
  condominiumId: string;
  title: string;
  content: string;
  scope: "ALL" | "TOWER" | "FLOOR" | "UNIT";
  targetTower?: string;
  targetFloor?: string;
  targetUnit?: string;
  sendWhatsApp: boolean;
  expiresAt?: string;
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      const { data } = await api.post("/announcements", input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/announcements/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
