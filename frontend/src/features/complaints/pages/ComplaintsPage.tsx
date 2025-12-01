import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import type { Complaint, ComplaintStatus } from '../types';
import { ComplaintViewModeToggle } from '../components';
import { ResidentComplaintsPage } from './ResidentComplaintsPage';
import { AdminComplaintsKanbanPage } from './AdminComplaintsKanbanPage';
import { AdminComplaintsTablePage } from './AdminComplaintsTablePage';
import { useRole } from '@/hooks/useRole';
import { useAppSelector } from '@/hooks';
import { selectCurrentCondominiumId } from '@/store/slices/condominiumSlice';
import { useResidents } from '@/features/residents/hooks/useResidentsApi';
import { 
  useComplaints, 
  useCreateComplaint, 
  useUpdateComplaint 
} from '../hooks/useComplaintsApi';

type ViewMode = 'kanban' | 'table';

export function ComplaintsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(null);
  const { toast } = useToast();
  
  const { isResident } = useRole();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  
  // Fetch residents
  const {
    data: residents = [],
    isLoading: isLoadingResidents,
  } = useResidents(currentCondominiumId || '', {});

  // Fetch complaints from API
  const {
    data: complaints = [],
    isLoading: isLoadingComplaints,
  } = useComplaints(currentCondominiumId || '');

  const createComplaint = useCreateComplaint();
  const updateComplaint = useUpdateComplaint();

  const handleComplaintSubmit = async (data: { category: string; content: string }) => {
    if (!currentCondominiumId) return;

    try {
      await createComplaint.mutateAsync({
        condominium_id: currentCondominiumId,
        category: data.category,
        description: data.content,
        status: 'pending',
        priority: 'medium',
      });

      toast({
        title: "Ocorrência registrada!",
        description: "Sua ocorrência foi registrada com sucesso e será analisada em breve.",
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to create complaint:', error);
      
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a ocorrência. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, complaint: Complaint) => {
    setDraggedComplaint(complaint);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Complaint['status']) => {
    e.preventDefault();
    if (draggedComplaint && draggedComplaint.status !== newStatus) {
      try {
        await updateComplaint.mutateAsync({
          id: draggedComplaint.id,
          status: newStatus,
        });

        toast({
          title: "Status atualizado!",
          description: `Ocorrência movida para ${getStatusLabel(newStatus)}.`,
          variant: "success",
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to update complaint:', error);
        
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar o status. Tente novamente.",
          variant: "error",
          duration: 5000,
        });
      }
    }
    setDraggedComplaint(null);
  };

  const handleStatusChange = async (complaintId: number, newStatus: ComplaintStatus) => {
    try {
      await updateComplaint.mutateAsync({
        id: complaintId,
        status: newStatus,
      });

      toast({
        title: "Status atualizado!",
        description: `Status alterado para ${getStatusLabel(newStatus)}.`,
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to update complaint:', error);
      
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  // Helper function to get status label
  const getStatusLabel = (status: ComplaintStatus): string => {
    const labels: Record<ComplaintStatus, string> = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      resolved: 'Resolvido',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
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
