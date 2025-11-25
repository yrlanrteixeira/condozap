import { useState, useCallback, useEffect } from 'react'
import type { Complaint } from '@/types'
import {
  getAllComplaints,
  createComplaint,
  updateComplaintStatus,
} from '@/services/complaintService'

interface UseComplaintsProps {
  onSuccess?: (message: string) => void
}

export function useComplaints({ onSuccess }: UseComplaintsProps = {}) {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(null)

  useEffect(() => {
    setComplaints(getAllComplaints())
  }, [])

  const handleComplaintSubmit = useCallback(
    (data: { category: string; content: string }) => {
      const newComplaint = createComplaint({
        residentId: '1',
        category: data.category,
        content: data.content,
      })
      setComplaints(getAllComplaints())
      onSuccess?.('Denúncia registrada anonimamente. Aguarde atualizações.')
    },
    [onSuccess]
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
        setComplaints(getAllComplaints())
        setDraggedComplaint(null)
      } catch (error) {
        console.error('Failed to update complaint status:', error)
      }
    },
    [draggedComplaint]
  )

  const refreshComplaints = useCallback(() => {
    setComplaints(getAllComplaints())
  }, [])

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
