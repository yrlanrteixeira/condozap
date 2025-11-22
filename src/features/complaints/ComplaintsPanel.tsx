import type { Complaint, Resident, UserRole } from '@/types'
import { ResidentComplaintsView } from './ResidentComplaintsView'
import { AdminKanbanView } from './AdminKanbanView'

interface ComplaintsPanelProps {
  userRole: UserRole
  complaints: Complaint[]
  residents: Resident[]
  onComplaintSubmit: (data: { category: string; content: string }) => void
  onDragStart: (e: React.DragEvent, complaint: Complaint) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, newStatus: Complaint['status']) => void
}

export function ComplaintsPanel({
  userRole,
  complaints,
  residents,
  onComplaintSubmit,
  onDragStart,
  onDragOver,
  onDrop,
}: ComplaintsPanelProps) {
  if (userRole === 'resident') {
    return (
      <ResidentComplaintsView complaints={complaints} onSubmit={onComplaintSubmit} />
    )
  }

  return (
    <AdminKanbanView
      complaints={complaints}
      residents={residents}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  )
}
