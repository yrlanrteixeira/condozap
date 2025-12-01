import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Complaint } from '../types';
import type { ComplaintStatus } from '@/types';
import { ComplaintViewModeToggle } from '../components';
import { ResidentComplaintsPage } from './ResidentComplaintsPage';
import { AdminComplaintsKanbanPage } from './AdminComplaintsKanbanPage';
import { AdminComplaintsTablePage } from './AdminComplaintsTablePage';
import { useRole } from '@/hooks/useRole';
import { useAppSelector } from '@/hooks';
import { selectCurrentCondominiumId } from '@/store/slices/condominiumSlice';
import { useResidents } from '@/features/residents/hooks/useResidentsApi';
// TODO: Create useComplaints hook
// import { useComplaints } from '../hooks/useComplaintsApi';

type ViewMode = 'kanban' | 'table';

export function ComplaintsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(null);
  
  const { isResident, userRole } = useRole();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  
  // Fetch residents
  const {
    data: residents = [],
    isLoading: isLoadingResidents,
  } = useResidents(currentCondominiumId || '', {});

  // TODO: Fetch complaints from API
  const complaints: Complaint[] = [];
  const isLoadingComplaints = false;

  const handleComplaintSubmit = (data: { category: string; content: string }) => {
    console.log('Submit complaint:', data);
    // TODO: Implementar criação via API
  };

  const handleDragStart = (e: React.DragEvent, complaint: Complaint) => {
    setDraggedComplaint(complaint);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: Complaint['status']) => {
    e.preventDefault();
    if (draggedComplaint && draggedComplaint.status !== newStatus) {
      console.log('Update complaint:', draggedComplaint.id, 'to status:', newStatus);
      // TODO: Implementar atualização via API
    }
    setDraggedComplaint(null);
  };

  const handleStatusChange = (complaintId: number, newStatus: ComplaintStatus) => {
    console.log('Update complaint:', complaintId, 'to status:', newStatus);
    // TODO: Implementar atualização via API
  };

  // Loading state
  if (isLoadingResidents || isLoadingComplaints) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // No condominium selected
  if (!currentCondominiumId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">
              Selecione um condomínio para visualizar as ocorrências.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Resident view
  if (isResident) {
    return <ResidentComplaintsPage complaints={complaints} onSubmit={handleComplaintSubmit} />;
  }

  // Admin/Syndic view
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 sm:p-6 pb-0">
        <ComplaintViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {viewMode === 'kanban' ? (
        <AdminComplaintsKanbanPage
          complaints={complaints}
          residents={residents}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
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
