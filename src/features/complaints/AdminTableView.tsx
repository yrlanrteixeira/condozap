import { Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Complaint, Resident, ComplaintStatus } from '@/types'
import { cn } from '@/lib/utils'

interface AdminTableViewProps {
  complaints: Complaint[]
  residents: Resident[]
  onStatusChange: (complaintId: number, newStatus: ComplaintStatus) => void
}

const STATUS_CONFIG = {
  open: {
    label: 'Em Fila',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-100',
  },
  in_progress: {
    label: 'Averiguando',
    icon: Clock,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  },
  resolved: {
    label: 'Resolvido',
    icon: CheckCircle,
    className: 'bg-green-50 text-green-700 border-green-100',
  },
} as const

export function AdminTableView({
  complaints,
  residents,
  onStatusChange,
}: AdminTableViewProps) {
  const getResidentInfo = (residentId: string) => {
    const resident = residents.find((r) => r.id === residentId)
    return resident ? `${resident.unit} - Torre ${resident.tower}` : 'Anônimo'
  }

  const getStatusConfig = (status: ComplaintStatus) => STATUS_CONFIG[status]

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
          Gestão de Ocorrências (Tabela)
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm">
          Visualização em tabela. Altere o status para notificar o morador automaticamente.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Categoria</TableHead>
                <TableHead className="font-bold">Descrição</TableHead>
                <TableHead className="font-bold">Unidade</TableHead>
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="font-bold w-[200px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    Nenhuma ocorrência registrada
                  </TableCell>
                </TableRow>
              ) : (
                complaints.map((complaint) => {
                  const statusConfig = getStatusConfig(complaint.status)
                  const Icon = statusConfig.icon

                  return (
                    <TableRow key={complaint.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border',
                            statusConfig.className
                          )}
                        >
                          <Icon size={12} />
                          {statusConfig.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {complaint.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-slate-700 truncate">
                          {complaint.content}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {getResidentInfo(complaint.residentId)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(complaint.timestamp).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={complaint.status}
                          onValueChange={(value) =>
                            onStatusChange(complaint.id, value as ComplaintStatus)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">
                              <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-red-500" />
                                Em Fila
                              </div>
                            </SelectItem>
                            <SelectItem value="in_progress">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-yellow-500" />
                                Averiguando
                              </div>
                            </SelectItem>
                            <SelectItem value="resolved">
                              <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-green-500" />
                                Resolvido
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-400 flex items-center gap-2">
        <ChevronRight size={14} />
        Total de {complaints.length} ocorrência(s) registrada(s)
      </div>
    </div>
  )
}
