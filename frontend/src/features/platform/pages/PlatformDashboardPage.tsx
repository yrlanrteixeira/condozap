import { Building2, Users, AlertTriangle, TrendingUp, Clock, PauseCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { PageHeaderSkeleton, StatsCardSkeleton } from "@/shared/components/ui/skeleton";
import { usePlatformStats } from "../hooks/usePlatformApi";

export function PlatformDashboardPage() {
  const { data: stats, isLoading, isError } = usePlatformStats();

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">
              Erro ao carregar os dados da plataforma. Tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Condomínios Ativos",
      value: stats.condominiums.active,
      icon: Building2,
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
    {
      label: "Condomínios em Trial",
      value: stats.condominiums.trial,
      icon: Clock,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      label: "Condomínios Suspensos",
      value: stats.condominiums.suspended,
      icon: PauseCircle,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
    {
      label: "Total de Síndicos",
      value: stats.syndics.total,
      icon: Users,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Trials Expirando em Breve",
      value: stats.trialsExpiringSoon,
      icon: AlertTriangle,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
    {
      label: "Novos Este Mês",
      value: stats.newThisMonth,
      icon: TrendingUp,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard da Plataforma</h1>
        <p className="text-muted-foreground">
          Visão geral de todos os condomínios e síndicos cadastrados na plataforma
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  </div>
                  <div className={`p-3 ${card.iconBg} rounded-full`}>
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-info" />
            Resumo da Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Total de condomínios cadastrados:{" "}
            <span className="font-semibold text-foreground">{stats.condominiums.total}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default PlatformDashboardPage;
