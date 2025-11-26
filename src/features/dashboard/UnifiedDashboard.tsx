import { AlertTriangle, Building2, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts'
import { MULTI_CONDO_COMPLAINTS, URGENT_FEED, CONDOMINIUMS } from '@/data/multiCondoMockData'
import type { UrgentFeedItem, ComplaintPriority } from '@/types'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<ComplaintPriority, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-yellow-900',
  low: 'bg-blue-500 text-white',
}

const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
}

export function UnifiedDashboard() {
  const { setCurrentCondominiumId, getAccessibleCondominiums } = useApp()

  const accessibleCondos = getAccessibleCondominiums()
  const totalCondos = accessibleCondos.length

  // Calcular métricas globais
  const totalComplaints = MULTI_CONDO_COMPLAINTS.length
  const criticalComplaints = MULTI_CONDO_COMPLAINTS.filter(c => c.priority === 'critical').length
  const openComplaints = MULTI_CONDO_COMPLAINTS.filter(c => c.status === 'open').length
  const inProgressComplaints = MULTI_CONDO_COMPLAINTS.filter(c => c.status === 'in_progress').length

  // Ocorrências por condomínio
  const complaintsByCondoId = MULTI_CONDO_COMPLAINTS.reduce((acc, complaint) => {
    if (!acc[complaint.condominiumId]) {
      acc[complaint.condominiumId] = { total: 0, critical: 0, open: 0 }
    }
    acc[complaint.condominiumId].total++
    if (complaint.priority === 'critical') acc[complaint.condominiumId].critical++
    if (complaint.status === 'open') acc[complaint.condominiumId].open++
    return acc
  }, {} as Record<string, { total: number; critical: number; open: number }>)

  const handleCondoClick = (condoId: string) => {
    setCurrentCondominiumId(condoId)
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'Agora mesmo'
    if (diffHours === 1) return 'Há 1 hora'
    if (diffHours < 24) return `Há ${diffHours} horas`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Há 1 dia'
    return `Há ${diffDays} dias`
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Unificado</h1>
        <p className="text-muted-foreground">
          Visão consolidada de todos os {totalCondos} condomínios sob sua gestão
        </p>
      </div>

      {/* Métricas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Condomínios</p>
                <p className="text-3xl font-bold text-foreground">{totalCondos}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Ocorrências Abertas</p>
                <p className="text-3xl font-bold text-foreground">{openComplaints}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Críticas (Urgente)</p>
                <p className="text-3xl font-bold text-destructive">{criticalComplaints}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Em Andamento</p>
                <p className="text-3xl font-bold text-foreground">{inProgressComplaints}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feed de Urgência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Feed de Urgência ({URGENT_FEED.length} não lidas)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {URGENT_FEED.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma ocorrência urgente no momento</p>
            </div>
          ) : (
            URGENT_FEED.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'p-4 rounded-lg border-l-4 hover:bg-accent/50 transition cursor-pointer',
                  item.priority === 'critical' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' : 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
                )}
                onClick={() => handleCondoClick(item.condominiumId)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn('text-xs', PRIORITY_COLORS[item.priority])}>
                        {PRIORITY_LABELS[item.priority]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        [{item.condominiumName}]
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(item.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Visão Geral por Condomínio */}
      <Card>
        <CardHeader>
          <CardTitle>Visão por Condomínio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accessibleCondos.map((condo) => {
            const stats = complaintsByCondoId[condo.id] || { total: 0, critical: 0, open: 0 }
            return (
              <div
                key={condo.id}
                className="p-4 rounded-lg border hover:border-primary transition cursor-pointer"
                onClick={() => handleCondoClick(condo.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{condo.name}</h4>
                    <p className="text-sm text-muted-foreground">{condo.address}</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    {stats.critical > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
                        <p className="text-xs text-muted-foreground">Críticas</p>
                      </div>
                    )}
                    <Button variant="outline" size="sm">
                      Acessar →
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
