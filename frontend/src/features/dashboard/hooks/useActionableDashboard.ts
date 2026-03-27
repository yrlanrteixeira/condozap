import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SlaAtRisk {
  complaintId: number;
  category: string;
  priority: string;
  slaType: string;
  minutesRemaining: number;
  residentName: string;
}

export interface ActionableDashboard {
  slaAtRisk: SlaAtRisk[];
  pendingApprovals: {
    count: number;
    oldestDays: number;
  };
  csatSummary: {
    averageScore: number;
    totalResponses: number;
    trend: number;
    worstCategory: string | null;
    worstCategoryScore: number | null;
  };
  resolutionStats: {
    avgHoursThisWeek: number;
    avgHoursLastWeek: number;
    trend: number;
    bySector: Array<{
      sectorName: string;
      avgHours: number;
      openCount: number;
    }>;
  };
  weeklyTrend: {
    opened: number;
    resolved: number;
    previousOpened: number;
    previousResolved: number;
  };
}

export function useActionableDashboard(condominiumId: string) {
  return useQuery<ActionableDashboard>({
    queryKey: ["dashboard", "actionable", condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/actionable/${condominiumId}`);
      return data;
    },
    enabled: !!condominiumId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
