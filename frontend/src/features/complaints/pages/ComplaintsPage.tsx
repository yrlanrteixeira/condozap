import { useState } from 'react';
import type { Complaint, Resident, UserRole, ComplaintStatus } from '@/types';
import { updateComplaintStatus } from '@/services/complaintService';
import { ComplaintViewModeToggle } from '../components';
import { ResidentComplaintsPage } from './ResidentComplaintsPage';
import { AdminComplaintsKanbanPage } from './AdminComplaintsKanbanPage';
import { AdminComplaintsTablePage } from './AdminComplaintsTablePage';

interface ComplaintsPageProps {
  userRole: UserRole;
  complaints: Complaint[];
  residents: Resident[];
  onComplaintSubmit: (data: { category: string; content: string }) => void;
  onDragStart: (e: React.DragEvent, complaint: Complaint) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, newStatus: Complaint['status']) => void;
  onComplaintsUpdate?: () => void;
}

type ViewMode = 'kanban' | 'table';

export function ComplaintsPage({
  userRole,
  complaints,
  residents,
  onComplaintSubmit,
  onDragStart,
  onDragOver,
  onDrop,
  onComplaintsUpdate,
}: ComplaintsPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  if (userRole === 'resident') {
    return <ResidentComplaintsPage complaints={complaints} onSubmit={onComplaintSubmit} />;
  }

  const handleStatusChange = (complaintId: number, newStatus: ComplaintStatus) => {
    try {
      updateComplaintStatus(complaintId, newStatus);
      onComplaintsUpdate?.();
    } catch (error) {
      console.error('Failed to update complaint status:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 sm:p-6 pb-0">
        <ComplaintViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {viewMode === 'kanban' ? (
        <AdminComplaintsKanbanPage
          complaints={complaints}
          residents={residents}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      ) : (
        <AdminComplaintsTablePage
          complaints={complaints}
          residents={residents}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

export default ComplaintsPage;
