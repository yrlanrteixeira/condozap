import { AlertTriangle, Clock, CheckCircle2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";

interface SectorStats {
  openCount: number;
  resolvedLast30Days: number;
  slaCompliancePercent: number;
  avgResponseTimeHours: number;
}

interface SectorDashboardKPIsProps {
  stats: SectorStats;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

function KpiCard({ title, value, icon, iconBgColor, iconColor }: KpiCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2.5 rounded-xl", iconBgColor, iconColor)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

export function SectorDashboardKPIs({ stats }: SectorDashboardKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Abertas"
        value={stats.openCount}
        icon={<AlertTriangle size={20} />}
        iconBgColor="bg-orange-500/10"
        iconColor="text-orange-500"
      />
      <KpiCard
        title="Tempo Médio"
        value={`${stats.avgResponseTimeHours}h`}
        icon={<Clock size={20} />}
        iconBgColor="bg-blue-500/10"
        iconColor="text-blue-500"
      />
      <KpiCard
        title="Resolvidas 30d"
        value={stats.resolvedLast30Days}
        icon={<CheckCircle2 size={20} />}
        iconBgColor="bg-green-500/10"
        iconColor="text-green-500"
      />
      <KpiCard
        title="SLA Cumprido"
        value={`${stats.slaCompliancePercent}%`}
        icon={<Shield size={20} />}
        iconBgColor="bg-purple-500/10"
        iconColor="text-purple-500"
      />
    </div>
  );
}
