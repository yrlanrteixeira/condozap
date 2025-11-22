import { useState } from 'react'
import { AlertTriangle, History, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Complaint } from '@/types'
import { COMPLAINT_CATEGORIES } from '@/data/mock'
import { cn } from '@/lib/utils'

interface ResidentComplaintsViewProps {
  complaints: Complaint[]
  onSubmit: (data: { category: string; content: string }) => void
}

export function ResidentComplaintsView({ complaints, onSubmit }: ResidentComplaintsViewProps) {
  const [newComplaint, setNewComplaint] = useState('')
  const [newCategory, setNewCategory] = useState(COMPLAINT_CATEGORIES[0])

  const myComplaints = complaints.filter((c) => c.residentId === '1')

  const handleSubmit = () => {
    if (!newComplaint) return
    onSubmit({ content: newComplaint, category: newCategory })
    setNewComplaint('')
  }

  const getStatusConfig = (status: Complaint['status']) => {
    switch (status) {
      case 'open':
        return {
          label: 'Em Fila',
          icon: <AlertTriangle size={14} />,
          className: 'bg-red-50 text-red-700 border-red-100',
        }
      case 'in_progress':
        return {
          label: 'Averiguando',
          icon: <Clock size={14} />,
          className: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        }
      case 'resolved':
        return {
          label: 'Resolvido',
          icon: <CheckCircle size={14} />,
          className: 'bg-green-50 text-green-700 border-green-100',
        }
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">
          Central de Denúncias (Anônimo)
        </h2>
        <p className="text-slate-500">
          Relate problemas com segurança total. Sua identidade é preservada.
        </p>
      </div>

      <Card className="mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2">
            <AlertTriangle size={20} className="text-green-600" />
            Nova Ocorrência
          </h3>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                Categoria
              </label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                Descrição do Problema
              </label>
              <Input
                placeholder="Ex: Som alto no andar de cima..."
                value={newComplaint}
                onChange={(e) => setNewComplaint(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Enviar Denúncia
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2">
          <History size={20} className="text-slate-400" />
          Meus Relatos
        </h3>

        <div className="space-y-3">
          {myComplaints.length === 0 && (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <p className="text-slate-500 italic">Nenhum registro encontrado.</p>
            </div>
          )}

          {myComplaints.map((c) => {
            const statusConfig = getStatusConfig(c.status)
            return (
              <Card key={c.id} className="hover:shadow-md transition">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {c.category}
                      </Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(c.timestamp).toLocaleDateString()} às{' '}
                        {new Date(c.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">{c.content}</p>
                  </div>

                  <div
                    className={cn(
                      'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 border',
                      statusConfig.className
                    )}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
