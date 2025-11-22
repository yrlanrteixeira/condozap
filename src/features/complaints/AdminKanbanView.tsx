import { AlertTriangle, Clock, CheckSquare, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Complaint, Resident, KanbanColumn } from '@/types'
import { cn } from '@/lib/utils'

interface AdminKanbanViewProps {
  complaints: Complaint[]
  residents: Resident[]
  onDragStart: (e: React.DragEvent, complaint: Complaint) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, newStatus: Complaint['status']) => void
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'open',
    title: 'Aguardando (Fila)',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    id: 'in_progress',
    title: 'Em Análise / Ronda',
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
  },
  {
    id: 'resolved',
    title: 'Finalizado',
    icon: CheckSquare,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
]

export function AdminKanbanView({
  complaints,
  residents,
  onDragStart,
  onDragOver,
  onDrop,
}: AdminKanbanViewProps) {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Gestão de Ocorrências (Kanban)
          </h2>
          <p className="text-slate-500 text-sm">
            Arraste os cartões para atualizar o status. O morador será notificado
            automaticamente.
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const Icon = col.icon
          const columnComplaints = complaints.filter((c) => c.status === col.id)

          return (
            <div
              key={col.id}
              className="flex-1 min-w-[300px] bg-slate-100 rounded-xl flex flex-col max-h-full"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.id)}
            >
              <div
                className={cn(
                  'p-4 border-b border-slate-200 flex items-center gap-2 font-bold bg-white rounded-t-xl',
                  col.color
                )}
              >
                <Icon size={18} />
                <span>{col.title}</span>
                <Badge variant="secondary" className="ml-auto">
                  {columnComplaints.length}
                </Badge>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {columnComplaints.map((c) => {
                  const resident = residents.find((r) => r.id === c.residentId)
                  return (
                    <Card
                      key={c.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, c)}
                      className="cursor-grab active:cursor-grabbing hover:shadow-md transition group"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="text-[10px] bg-slate-400 text-white">
                            {c.category}
                          </Badge>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-800 text-sm mb-3 font-medium">
                          {c.content}
                        </p>
                        <div className="text-xs text-slate-500">
                          {resident
                            ? `Unid. ${resident.unit} (${resident.tower})`
                            : 'Anônimo'}
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2 border-t pt-2 border-slate-100">
                          <ArrowRight size={12} />
                          Arraste para mover
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {columnComplaints.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
