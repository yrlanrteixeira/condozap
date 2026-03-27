import { useState } from "react";
import { Users, MessageSquare, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { StatsCardSkeleton, CardSkeleton } from "@/shared/components/ui/skeleton";
import { useAppSelector } from "@/shared/hooks";
import { useAuth } from "@/shared/hooks/useAuth";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { useDashboardMetrics } from "../hooks/useDashboardApi";
import { useActionableDashboard } from "../hooks/useActionableDashboard";
import { useOnboarding } from "../hooks/useOnboarding";
import {
  DashboardStatCard,
  DashboardPeriodSelector,
  ComplaintsCategoryChart,
  ComplaintsTowerChart,
  DashboardMessageStats,
  OnboardingChecklist,
  ActionableCards,
  type Period,
} from "../components";

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { user } = useAuth();

  // SUPER_ADMIN goes to /platform — dashboard is for condominium admins only
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // SUPER_ADMIN sem condomínio selecionado usa 'all' para métricas genéricas
  const condoIdToFetch = isSuperAdmin
    ? currentCondominiumId || "all"
    : currentCondominiumId || "";

  const {
    data: metrics,
    isLoading,
    isError,
  } = useDashboardMetrics(condoIdToFetch);

  // Actionable dashboard and onboarding only make sense for a concrete condominium
  const hasCondominium = !!currentCondominiumId;

  const { data: actionableData, isLoading: isActionableLoading } =
    useActionableDashboard(hasCondominium ? currentCondominiumId : "");

  const { data: onboardingData } = useOnboarding(
    hasCondominium ? currentCondominiumId : ""
  );

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // No condominium selected (non-SUPER_ADMIN without a linked condominium)
  if (!currentCondominiumId && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 max-w-md text-center">
          <CardContent className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Selecione um condomínio
            </h3>
            <p className="text-sm text-muted-foreground">
              Utilize o seletor no topo da página para escolher o condomínio que deseja visualizar.
            </p>
          </CardContent>
        </Card>
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

  const showOnboarding =
    hasCondominium &&
    onboardingData !== undefined &&
    !onboardingData.completed;

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

      {/* Onboarding checklist — shown when setup is incomplete */}
      {showOnboarding && (
        <OnboardingChecklist steps={onboardingData.steps} />
      )}

      {/* Actionable dashboard cards — shown when a condominium is selected */}
      {hasCondominium && !isActionableLoading && actionableData && (
        <ActionableCards data={actionableData} />
      )}

      {/* Generic metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardStatCard
          title="Total Moradores"
          value={metrics.residents.total}
          icon={<Users size={24} />}
          iconBgColor="bg-info/10"
          iconColor="text-info"
        />
        <DashboardStatCard
          title="Mensagens Enviadas"
          value={metrics.messages.totalSent}
          icon={<MessageSquare size={24} />}
          iconBgColor="bg-success/10"
          iconColor="text-success"
        />
        <DashboardStatCard
          title="Ocorrências Abertas"
          value={metrics.complaints.open}
          icon={<AlertTriangle size={24} />}
          iconBgColor="bg-destructive/10"
          iconColor="text-destructive"
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
