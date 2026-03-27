import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActionableDashboard } from "../hooks/useActionableDashboard";

interface ActionableCardsProps {
  data: ActionableDashboard;
}

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-muted-foreground text-xs">0%</span>;
  }
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        isPositive ? "text-success" : "text-destructive"
      )}
    >
      <Icon className="h-3 w-3" />
      {isPositive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function ActionableCards({ data }: ActionableCardsProps) {
  const navigate = useNavigate();

  const slaCount = data.slaAtRisk.length;
  const pendingCount = data.pendingApprovals.count;
  const oldestDays = data.pendingApprovals.oldestDays;
  const csatScore = data.csatSummary.averageScore;
  const csatTrend = data.csatSummary.trend;

  const openedChange = percentChange(
    data.weeklyTrend.opened,
    data.weeklyTrend.previousOpened
  );
  const resolvedChange = percentChange(
    data.weeklyTrend.resolved,
    data.weeklyTrend.previousResolved
  );

  const sectorsSorted = [...data.resolutionStats.bySector].sort(
    (a, b) => b.openCount - a.openCount
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Row 1 — Alert cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* SLA em Risco */}
        <Card
          className={cn(
            "cursor-pointer transition-shadow hover:shadow-md",
            slaCount > 0 && "border-destructive/40"
          )}
          onClick={() => navigate("/complaints")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SLA em Risco
            </CardTitle>
            <div
              className={cn(
                "p-2.5 rounded-xl",
                slaCount > 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-bold tracking-tight",
                slaCount > 0 ? "text-destructive" : "text-foreground"
              )}
            >
              {slaCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {slaCount === 0
                ? "Nenhuma ocorrencia em risco"
                : slaCount === 1
                ? "ocorrencia com prazo critico"
                : "ocorrencias com prazo critico"}
            </p>
          </CardContent>
        </Card>

        {/* Cadastros Pendentes */}
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => navigate("/user-approval")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cadastros Pendentes
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-warning/10 text-warning">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {pendingCount}
            </div>
            {pendingCount > 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                ha {oldestDays} {oldestDays === 1 ? "dia" : "dias"} aguardando
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum cadastro pendente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Satisfacao */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Satisfacao
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500">
              <Star className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {csatScore > 0 ? csatScore.toFixed(1) : "—"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {data.csatSummary.totalResponses > 0
                  ? `${data.csatSummary.totalResponses} avaliacoes`
                  : "Sem avaliacoes"}
              </p>
              {data.csatSummary.totalResponses > 0 && (
                <TrendIndicator value={csatTrend} />
              )}
            </div>
            {data.csatSummary.worstCategory && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Pior: {data.csatSummary.worstCategory}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Weekly trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Esta Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Abertas</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {data.weeklyTrend.opened}
                </span>
                <TrendIndicator value={openedChange} />
              </div>
              <p className="text-xs text-muted-foreground">
                Semana anterior: {data.weeklyTrend.previousOpened}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Resolvidas</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {data.weeklyTrend.resolved}
                </span>
                <TrendIndicator value={resolvedChange} />
              </div>
              <p className="text-xs text-muted-foreground">
                Semana anterior: {data.weeklyTrend.previousResolved}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 3 — Resolution by sector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Resolucao por Setor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sectorsSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum dado de setor disponivel
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Setor</th>
                    <th className="pb-2 text-right font-medium">
                      Tempo medio (h)
                    </th>
                    <th className="pb-2 text-right font-medium">Em aberto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sectorsSorted.map((sector) => (
                    <tr key={sector.sectorName} className="hover:bg-muted/50">
                      <td className="py-2 pr-4 font-medium">
                        {sector.sectorName}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {sector.avgHours > 0
                          ? sector.avgHours.toFixed(1)
                          : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={cn(
                            "font-semibold",
                            sector.openCount > 0
                              ? "text-destructive"
                              : "text-success"
                          )}
                        >
                          {sector.openCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
