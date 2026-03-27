import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NotificationsResponse } from "../types";

const KEYS = {
  list: ["notifications"] as const,
  unread: ["notifications", "unread-count"] as const,
};

export function useNotifications(limit = 20) {
  return useQuery<NotificationsResponse>({
    queryKey: [...KEYS.list, limit],
    queryFn: async () => {
      const { data } = await api.get("/notifications", { params: { limit } });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery<{ unreadCount: number }>({
    queryKey: KEYS.unread,
    queryFn: async () => {
      const { data } = await api.get("/notifications/unread-count");
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list });
      qc.invalidateQueries({ queryKey: KEYS.unread });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list });
      qc.invalidateQueries({ queryKey: KEYS.unread });
    },
  });
}
