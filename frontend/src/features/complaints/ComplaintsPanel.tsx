import { useState } from 'react'
import { LayoutGrid, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Complaint, Resident, UserRole, ComplaintStatus } from '@/types'
import { ResidentComplaintsView } from './ResidentComplaintsView'
import { AdminKanbanView } from './AdminKanbanView'
import { AdminTableView } from './AdminTableView'
import { updateComplaintStatus, getAllComplaints } from '@/services/complaintService'

interface ComplaintsPanelProps {
  userRole: UserRole
  complaints: Complaint[]
  residents: Resident[]
  onComplaintSubmit: (data: { category: string; content: string }) => void
  onDragStart: (e: React.DragEvent, complaint: Complaint) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, newStatus: Complaint['status']) => void
  onComplaintsUpdate?: () => void
}

type ViewMode = 'kanban' | 'table'

export function ComplaintsPanel({
  userRole,
  complaints,
  residents,
  onComplaintSubmit,
  onDragStart,
  onDragOver,
  onDrop,
  onComplaintsUpdate,
}: ComplaintsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  if (userRole === 'resident') {
    return (
      <ResidentComplaintsView complaints={complaints} onSubmit={onComplaintSubmit} />
    )
  }

  const handleStatusChange = (complaintId: number, newStatus: ComplaintStatus) => {
    try {
      updateComplaintStatus(complaintId, newStatus)
      onComplaintsUpdate?.()
    } catch (error) {
      console.error('Failed to update complaint status:', error)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 sm:p-6 pb-0">
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="gap-2"
          >
            <LayoutGrid size={16} />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-2"
          >
            <TableIcon size={16} />
            Tabela
          </Button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <AdminKanbanView
          complaints={complaints}
          residents={residents}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      ) : (
        <AdminTableView
          complaints={complaints}
          residents={residents}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

export default ComplaintsPanel
