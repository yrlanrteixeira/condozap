import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ReportType = "complaints" | "messages" | "residents" | "satisfaction";

export interface ReportResponse {
  period: { start: string; end: string };
  type: string;
  data: Record<string, unknown>;
}

export interface ReportParams {
  startDate: string;
  endDate: string;
  type: ReportType;
}

export function useReport(
  condominiumId: string,
  params: ReportParams | null
) {
  return useQuery<ReportResponse>({
    queryKey: ["reports", condominiumId, params],
    queryFn: async () => {
      const { data } = await api.get(`/reports/${condominiumId}`, {
        params: { ...params, format: "json" },
      });
      return data;
    },
    enabled: !!condominiumId && !!params,
  });
}

export async function downloadReportCsv(
  condominiumId: string,
  params: ReportParams
) {
  const response = await api.get(`/reports/${condominiumId}`, {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });
  const blob = new Blob([response.data], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-${params.type}-${params.startDate}_a_${params.endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
