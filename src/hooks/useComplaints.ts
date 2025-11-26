import { useState, useCallback, useEffect } from 'react'
import type { Complaint } from '@/types'
import {
  getAllComplaints,
  createComplaint,
  updateComplaintStatus,
} from '@/services/complaintService'

interface UseComplaintsProps {
  onSuccess?: (message: string) => void
  initialComplaints?: Complaint[]
  currentCondominiumId?: string
}

export function useComplaints({ onSuccess, initialComplaints = [], currentCondominiumId }: UseComplaintsProps = {}) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints)
  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(null)

  useEffect(() => {
    setComplaints(initialComplaints)
  }, [initialComplaints])

  const handleComplaintSubmit = useCallback(
    (data: { category: string; content: string; residentId?: string }) => {
      const newComplaint = createComplaint({
        condominiumId: currentCondominiumId || 'condo-1',
        residentId: data.residentId || '1',
        category: data.category,
        content: data.content,
      })
      // Atualizar lista de complaints com o novo
      setComplaints(prev => [...prev, newComplaint])
      onSuccess?.('Ocorrência registrada com sucesso. Aguarde atualizações.')
    },
    [onSuccess, currentCondominiumId]
  )

  const onDragStart = useCallback(
    (e: React.DragEvent, complaint: Complaint) => {
      setDraggedComplaint(complaint)
      e.dataTransfer.effectAllowed = 'move'
    },
    []
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent, newStatus: Complaint['status']) => {
      e.preventDefault()
      if (!draggedComplaint) return
      if (draggedComplaint.status === newStatus) return

      try {
        updateComplaintStatus(draggedComplaint.id, newStatus)
        // Atualizar localmente ao invés de recarregar tudo
        setComplaints(prev =>
          prev.map(c => c.id === draggedComplaint.id ? { ...c, status: newStatus } : c)
        )
        setDraggedComplaint(null)
      } catch (error) {
        console.error('Failed to update complaint status:', error)
      }
    },
    [draggedComplaint]
  )

  const refreshComplaints = useCallback(() => {
    setComplaints(initialComplaints)
  }, [initialComplaints])

  return {
    complaints,
    draggedComplaint,
    handleComplaintSubmit,
    onDragStart,
    onDragOver,
    onDrop,
    refreshComplaints,
  }
}
