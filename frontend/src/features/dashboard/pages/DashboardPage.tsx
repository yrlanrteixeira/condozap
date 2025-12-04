import { useState } from "react";
import { Loader2, Users, MessageSquare, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { selectCurrentCondominiumId } from "@/store/slices/condominiumSlice";
import { useDashboardMetrics } from "../hooks/useDashboardApi";
import {
  DashboardStatCard,
  DashboardPeriodSelector,
  ComplaintsCategoryChart,
  ComplaintsTowerChart,
  DashboardMessageStats,
  type Period,
} from "../components";

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { user } = useAuth();

  // SUPER_ADMIN vê métricas globais, outros veem apenas do condomínio selecionado
  const condoIdToFetch = user?.role === 'SUPER_ADMIN' ? 'all' : (currentCondominiumId || '');

  const {
    data: metrics,
    isLoading,
    isError,
  } = useDashboardMetrics(condoIdToFetch);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">
              Erro ao carregar métricas do dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalComplaints = metrics.complaints.total;
  const complaintsByCategory = Object.entries(
    metrics.complaints.byCategory || {}
  )
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count);

  const complaintsByTower = metrics.complaints.byTower || {};

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Visão geral do condomínio
          </p>
        </div>
        <DashboardPeriodSelector period={period} onPeriodChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardStatCard
          title="Total Moradores"
          value={metrics.residents.total}
          icon={<Users size={24} />}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <DashboardStatCard
          title="Mensagens Enviadas"
          value={metrics.messages.totalSent}
          icon={<MessageSquare size={24} />}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
        />
        <DashboardStatCard
          title="Ocorrências Abertas"
          value={metrics.complaints.open}
          icon={<AlertTriangle size={24} />}
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ComplaintsCategoryChart
          categories={complaintsByCategory}
          totalComplaints={totalComplaints}
        />

        <ComplaintsTowerChart
          complaintsByTower={complaintsByTower}
          totalComplaints={totalComplaints}
        />

        <DashboardMessageStats
          stats={{
            totalSent: metrics.messages.totalSent,
            delivered: metrics.messages.delivered,
            read: metrics.messages.read,
            failed: metrics.messages.failed,
          }}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
