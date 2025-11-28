import { AlertTriangle, History, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { COMPLAINT_CATEGORIES } from '@/types'
import { ComplaintSchema, type ComplaintFormData } from '@/schemas'
import { cn } from '@/lib/utils'

interface ResidentComplaintsViewProps {
  complaints: Complaint[]
  onSubmit: (data: { category: string; content: string }) => void
}

export function ResidentComplaintsView({ complaints, onSubmit }: ResidentComplaintsViewProps) {
  const myComplaints = complaints.filter((c) => c.residentId === '1')

  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComplaintFormData>({
    resolver: zodResolver(ComplaintSchema),
    defaultValues: {
      category: COMPLAINT_CATEGORIES[0],
      content: '',
    },
  })

  const category = watch('category')

  const handleSubmit = (data: ComplaintFormData) => {
    onSubmit({ content: data.content, category: data.category })
    reset()
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
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Central de Denúncias (Anônimo)
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Relate problemas com segurança total. Sua identidade é preservada.
        </p>
      </div>

      <Card className="mb-6 sm:mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-foreground flex items-center gap-2">
            <AlertTriangle size={20} className="text-primary" />
            Nova Ocorrência
          </h3>

          <form onSubmit={handleFormSubmit(handleSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                  Categoria
                </label>
                <Select
                  value={category}
                  onValueChange={(value) => setValue('category', value as typeof COMPLAINT_CATEGORIES[number])}
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
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
                {errors.category && (
                  <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">
                  Descrição do Problema
                </label>
                <Input
                  placeholder="Ex: Som alto no andar de cima..."
                  {...register('content')}
                  className={errors.content ? 'border-red-500' : ''}
                />
                {errors.content && (
                  <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Denúncia'}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-foreground flex items-center gap-2">
          <History size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
          Meus Relatos
        </h3>

        <div className="space-y-2 sm:space-y-3">
          {myComplaints.length === 0 && (
            <div className="text-center py-10 bg-muted/50 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground italic">Nenhum registro encontrado.</p>
            </div>
          )}

          {myComplaints.map((c) => {
            const statusConfig = getStatusConfig(c.status)
            return (
              <Card key={c.id} className="hover:shadow-md transition">
                <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {c.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(c.timestamp).toLocaleDateString()} às{' '}
                        {new Date(c.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-foreground font-medium">{c.content}</p>
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
