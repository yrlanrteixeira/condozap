import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface PlatformStats {
  condominiums: { total: number; active: number; trial: number; suspended: number };
  syndics: { total: number };
  newThisMonth: number;
  trialsExpiringSoon: number;
}

export function usePlatformStats() {
  return useQuery<PlatformStats>({
    queryKey: ["platform", "stats"],
    queryFn: async () => {
      const response = await api.get("/platform/stats");
      return response.data;
    },
  });
}
