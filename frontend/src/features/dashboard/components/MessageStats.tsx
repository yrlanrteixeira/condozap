import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MessageStats {
  totalRecipients: number
  deliveryRate: number
  last7Days: number
}

interface MessageStatsCardProps {
  stats: MessageStats
}

export function MessageStatsCard({ stats }: MessageStatsCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BarChart3 className="text-blue-500" size={20} />
          Estatísticas de Mensagens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Total de Destinatários</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalRecipients}</p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Taxa de Entrega</p>
            <p className="text-2xl font-bold text-green-600">{stats.deliveryRate.toFixed(1)}%</p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Últimos 7 Dias</p>
            <p className="text-2xl font-bold text-foreground">{stats.last7Days}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

