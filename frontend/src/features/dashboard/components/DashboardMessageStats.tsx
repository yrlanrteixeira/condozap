import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";

interface MessageStats {
  totalSent: number;
  delivered: number;
  read: number;
  failed: number;
}

interface DashboardMessageStatsProps {
  stats: MessageStats;
}

export function DashboardMessageStats({ stats }: DashboardMessageStatsProps) {
  const deliveryRate =
    stats.totalSent > 0
      ? Math.round((stats.delivered / stats.totalSent) * 100)
      : 0;

  const readRate =
    stats.delivered > 0 ? Math.round((stats.read / stats.delivered) * 100) : 0;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5" />
          Estatísticas de Mensagens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MessageSquare className="h-4 w-4" />
              Total Enviadas
            </div>
            <p className="text-2xl font-bold">{stats.totalSent}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Entregues
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats.delivered}
            </p>
            <p className="text-xs text-muted-foreground">{deliveryRate}% do total</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4 text-blue-600" />
              Lidas
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.read}</p>
            <p className="text-xs text-muted-foreground">{readRate}% das entregues</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <XCircle className="h-4 w-4 text-red-600" />
              Falhas
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalSent > 0
                ? Math.round((stats.failed / stats.totalSent) * 100)
                : 0}
              % do total
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

