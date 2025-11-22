import { useState, useCallback } from 'react'
import type { Complaint, Resident, TargetData, MessageContent, Message } from '@/types'
import { INITIAL_COMPLAINTS } from '@/data/mock'

interface UseComplaintsProps {
  residents: Resident[]
  sendMessage: (targetData: TargetData, messageType: Message['type'], content: MessageContent) => void
  onSuccess?: (message: string) => void
}

export function useComplaints({ residents, sendMessage, onSuccess }: UseComplaintsProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS)
  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(null)

  const handleComplaintSubmit = useCallback(
    (data: { category: string; content: string }) => {
      const newComplaint: Complaint = {
        id: Date.now(),
        residentId: '1',
        category: data.category,
        content: data.content,
        status: 'open',
        timestamp: new Date().toISOString(),
      }
      setComplaints((prev) => [newComplaint, ...prev])
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

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === draggedComplaint.id ? { ...c, status: newStatus } : c
        )
      )

      const resident = residents.find((r) => r.id === draggedComplaint.residentId)
      if (resident) {
        let messageText = ''
        if (newStatus === 'in_progress') {
          messageText = `Olá. Sua denúncia sobre "${draggedComplaint.category}" foi recebida e já está em análise pelo síndico/ronda.`
        } else if (newStatus === 'resolved') {
          messageText = `Olá. Boas notícias! A denúncia sobre "${draggedComplaint.category}" foi finalizada/resolvida.`
        }

        if (messageText) {
          sendMessage(
            { scope: 'unit', unit: resident.unit, tower: resident.tower },
            'text',
            { text: messageText }
          )
        }
      }

      setDraggedComplaint(null)
    },
    [draggedComplaint, residents, sendMessage]
  )

  return {
    complaints,
    draggedComplaint,
    handleComplaintSubmit,
    onDragStart,
    onDragOver,
    onDrop,
  }
}
