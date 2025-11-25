import { Users, MessageSquare, AlertTriangle, PieChart, Building, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Resident, Message, Complaint } from '@/types'
import { COMPLAINT_CATEGORIES, TEMPLATES } from '@/data/mockData'

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
          <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
          <p className="text-3xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${iconBgColor} ${iconColor}`}>{icon}</div>
      </CardContent>
    </Card>
  )
}

export function Dashboard({ residents, messageLog, complaints }: DashboardProps) {
  const totalComplaints = complaints.length
  const complaintsByCategory = COMPLAINT_CATEGORIES.map((cat) => ({
    name: cat,
    count: complaints.filter((c) => c.category === cat).length,
  })).sort((a, b) => b.count - a.count)

  const complaintsByTower = residents.reduce(
    (acc, resident) => {
      const residentComplaints = complaints.filter(
        (c) => c.residentId === resident.id
      ).length
      if (!acc[resident.tower]) acc[resident.tower] = 0
      acc[resident.tower] += residentComplaints
      return acc
    },
    {} as Record<string, number>
  )

  const messageSubjects = messageLog.reduce(
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

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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
          value={messageLog.length}
          icon={<MessageSquare size={24} />}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Ocorrências Abertas"
          value={complaints.filter((c) => c.status === 'open').length}
          icon={<AlertTriangle size={24} />}
          iconBgColor="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <PieChart className="text-purple-500" size={20} />
              Tipos de Reclamação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {complaintsByCategory.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 font-medium">{item.name}</span>
                  <span className="text-slate-900 font-bold">{item.count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
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
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <Building className="text-orange-500" size={20} />
              Ocorrências por Torre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 sm:gap-8 h-48 pb-2 border-b border-slate-100 justify-center overflow-x-auto">
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
                  <span className="text-sm font-bold text-slate-600">Torre {tower}</span>
                </div>
              ))}
              {Object.keys(complaintsByTower).length === 0 && (
                <div className="text-slate-400 text-sm self-center">
                  Sem dados suficientes
                </div>
              )}
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">
              Comparativo de volume de chamados entre torres
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <BarChart3 className="text-blue-500" size={20} />
              Notificações por Assunto/Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Object.entries(messageSubjects).map(([subject, count]) => (
                <div
                  key={subject}
                  className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between"
                >
                  <span className="text-sm text-slate-600 font-medium truncate pr-2">
                    {subject}
                  </span>
                  <span className="bg-white px-3 py-1 rounded-full text-blue-600 font-bold shadow-sm text-sm">
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
