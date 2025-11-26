import { useState } from 'react'
import { Users, MessageSquare, AlertTriangle, PieChart, Building, BarChart3, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Resident, Message, Complaint } from '@/types'
import { COMPLAINT_CATEGORIES, TEMPLATES } from '@/data/mockData'
import { cn } from '@/lib/utils'

interface DashboardProps {
  residents: Resident[]
  messageLog: Message[]
  complaints: Complaint[]
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  iconBgColor: string
  iconColor: string
}

function StatCard({ title, value, icon, iconBgColor, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${iconBgColor} ${iconColor}`}>{icon}</div>
      </CardContent>
    </Card>
  )
}

type Period = '7d' | '30d' | 'all'

export function Dashboard({ residents, messageLog, complaints }: DashboardProps) {
  const [period, setPeriod] = useState<Period>('30d')

  const filterByPeriod = <T extends { timestamp: string }>(items: T[]): T[] => {
    if (period === 'all') return items

    const now = new Date()
    const daysAgo = period === '7d' ? 7 : 30
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    return items.filter(item => new Date(item.timestamp) >= cutoffDate)
  }

  const filteredComplaints = filterByPeriod(complaints)
  const filteredMessages = filterByPeriod(messageLog)

  const totalComplaints = filteredComplaints.length
  const complaintsByCategory = COMPLAINT_CATEGORIES.map((cat) => ({
    name: cat,
    count: filteredComplaints.filter((c) => c.category === cat).length,
  })).sort((a, b) => b.count - a.count)

  const complaintsByTower = residents.reduce(
    (acc, resident) => {
      const residentComplaints = filteredComplaints.filter(
        (c) => c.residentId === resident.id
      ).length
      if (!acc[resident.tower]) acc[resident.tower] = 0
      acc[resident.tower] += residentComplaints
      return acc
    },
    {} as Record<string, number>
  )

  const messageSubjects = filteredMessages.reduce(
    (acc, msg) => {
      const subject =
        msg.type === 'text'
          ? 'Texto Livre / Aviso Rápido'
          : msg.type === 'image'
            ? 'Mídia'
            : TEMPLATES.find((t) => t.name === msg.templateName)?.label || msg.templateName

      if (!acc[subject as string]) acc[subject as string] = 0
      acc[subject as string]++
      return acc
    },
    {} as Record<string, number>
  )

  const periodLabels: Record<Period, string> = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    'all': 'Todo período'
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Visão geral do condomínio</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-muted-foreground" />
          <div className="flex gap-1">
            {(['7d', '30d', 'all'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
                className={cn(
                  'text-xs',
                  period === p && 'bg-primary text-primary-foreground'
                )}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Total Moradores"
          value={residents.length}
          icon={<Users size={24} />}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Mensagens Enviadas"
          value={filteredMessages.length}
          icon={<MessageSquare size={24} />}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Ocorrências Abertas"
          value={filteredComplaints.filter((c) => c.status === 'open').length}
          icon={<AlertTriangle size={24} />}
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <PieChart className="text-purple-500" size={20} />
              Tipos de Reclamação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {complaintsByCategory.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground font-medium">{item.name}</span>
                  <span className="text-foreground font-bold">{item.count}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${totalComplaints > 0 ? (item.count / totalComplaints) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Building className="text-orange-500" size={20} />
              Ocorrências por Torre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 sm:gap-8 h-48 pb-2 border-b border-border justify-center overflow-x-auto">
              {Object.entries(complaintsByTower).map(([tower, count]) => (
                <div key={tower} className="flex flex-col items-center gap-2 group flex-shrink-0">
                  <div
                    className="relative w-12 sm:w-16 bg-orange-100 rounded-t-lg transition-all duration-500 group-hover:bg-orange-200 flex items-end justify-center"
                    style={{
                      height: `${(count / totalComplaints) * 100}%`,
                      minHeight: '20px',
                    }}
                  >
                    <span className="mb-2 font-bold text-orange-700">{count}</span>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground">Torre {tower}</span>
                </div>
              ))}
              {Object.keys(complaintsByTower).length === 0 && (
                <div className="text-muted-foreground text-sm self-center">
                  Sem dados suficientes
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Comparativo de volume de chamados entre torres
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="text-blue-500" size={20} />
              Notificações por Assunto/Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Object.entries(messageSubjects).map(([subject, count]) => (
                <div
                  key={subject}
                  className="bg-muted/50 p-4 rounded-lg border border-border flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground font-medium truncate pr-2">
                    {subject}
                  </span>
                  <span className="bg-card px-3 py-1 rounded-full text-blue-600 font-bold shadow-sm text-sm">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
