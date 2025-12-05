import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import type { Complaint, ComplaintStatus } from "../types";
import { ComplaintViewModeToggle } from "../components";
import { ResidentComplaintsPage } from "./ResidentComplaintsPage";
import { AdminComplaintsKanbanPage } from "./AdminComplaintsKanbanPage";
import { AdminComplaintsTablePage } from "./AdminComplaintsTablePage";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useAppSelector, useIsMobile } from "@/hooks";
import { selectCurrentCondominiumId } from "@/store/slices/condominiumSlice";
import { useResidents } from "@/features/residents/hooks/useResidentsApi";
import {
  useComplaints,
  useCreateComplaint,
  useUpdateComplaintStatus,
} from "../hooks/useComplaintsApi";

type ViewMode = "kanban" | "table";

export function ComplaintsPage() {
  const isMobile = useIsMobile();
  
  // No mobile, inicia com modo tabela (cards), no desktop com kanban
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "table" : "kanban");
  
  // Atualizar viewMode quando mudar entre mobile/desktop
  useEffect(() => {
    setViewMode(isMobile ? "table" : "kanban");
  }, [isMobile]);
  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(
    null
  );
  const { toast } = useToast();

  const { isResident } = useRole();
  const { user } = useAuth();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);

  // SUPER_ADMIN vê ocorrências globais, outros veem apenas do condomínio selecionado
  const condoIdToFetch = currentCondominiumId || '';

  // Fetch residents
  const { data: residents = [], isLoading: isLoadingResidents } = useResidents(
    condoIdToFetch,
    {}
  );

  // Fetch complaints from API
  const { data: complaints = [], isLoading: isLoadingComplaints } =
    useComplaints(condoIdToFetch);

  const createComplaint = useCreateComplaint();
  const updateComplaintStatus = useUpdateComplaintStatus();

  const handleComplaintSubmit = async (data: {
    category: string;
    content: string;
  }) => {
    if (!currentCondominiumId) {
      toast({
        title: "Erro",
        description: "Nenhum condomínio selecionado.",
        variant: "error",
        duration: 5000,
      });
      return;
    }

    const residentId = (user as any)?.residentId;

    if (!residentId) {
      toast({
        title: "Erro",
        description:
          "Não foi possível identificar seu registro de morador. Tente fazer logout e login novamente.",
        variant: "error",
        duration: 5000,
      });
      return;
    }

    try {
      await createComplaint.mutateAsync({
        condominiumId: currentCondominiumId,
        residentId: residentId,
        category: data.category,
        content: data.content,
        priority: "MEDIUM",
        isAnonymous: false,
      });

      toast({
        title: "Ocorrência registrada!",
        description:
          "Sua ocorrência foi registrada com sucesso e será analisada em breve.",
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to create complaint:", error);

      toast({
        title: "Erro ao registrar",
        description:
          "Não foi possível registrar a ocorrência. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, complaint: Complaint) => {
    setDraggedComplaint(complaint);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (
    e: React.DragEvent,
    newStatus: Complaint["status"]
  ) => {
    e.preventDefault();
    if (draggedComplaint && draggedComplaint.status !== newStatus) {
      try {
        await updateComplaintStatus.mutateAsync({
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
        console.error("Failed to update complaint:", error);

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

  const handleStatusChange = async (
    complaintId: number,
    newStatus: ComplaintStatus
  ) => {
    try {
      await updateComplaintStatus.mutateAsync({
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
      console.error("Failed to update complaint:", error);

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
      OPEN: "Aberto",
      IN_PROGRESS: "Em Andamento",
      RESOLVED: "Resolvido",
    };
    return labels[status] || status;
  };

  // Loading state
  if (isLoadingResidents || isLoadingComplaints) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, colIndex) => (
            <div key={colIndex} className="space-y-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <KanbanCardSkeleton key={i} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No condominium selected (except for SUPER_ADMIN)
  if (!currentCondominiumId && user?.role !== "SUPER_ADMIN") {
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
    return (
      <ResidentComplaintsPage
        complaints={complaints}
        onSubmit={handleComplaintSubmit}
      />
    );
  }

  // Admin/Syndic view
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 sm:p-6 pb-0">
        <ComplaintViewModeToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {viewMode === "kanban" ? (
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
