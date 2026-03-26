import { useState, useCallback } from "react";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { KanbanCardSkeleton, PageHeaderSkeleton } from "@/shared/components/ui/skeleton";
import { useToast } from "@/shared/components/ui/use-toast";
import type { Complaint, ComplaintStatus } from "../types";
import {
  ComplaintViewModeToggle,
  ComplaintDetailSheet,
  AdminComplaintsMobileList,
} from "../components";
import { ResidentComplaintsPage } from "./ResidentComplaintsPage";
import { AdminComplaintsKanbanPage } from "./AdminComplaintsKanbanPage";
import { AdminComplaintsTablePage } from "./AdminComplaintsTablePage";
import { useRole } from "@/shared/hooks/useRole";
import { useAuth } from "@/shared/hooks/useAuth";
import { useAppSelector, useIsMobile } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { useResidents } from "@/features/residents/hooks/useResidentsApi";
import {
  useComplaints,
  useCreateComplaint,
  useUpdateComplaintStatus,
} from "../hooks/useComplaintsApi";

type ViewMode = "kanban" | "table";

export function ComplaintsPage() {
  const isMobile = useIsMobile();

  // Default: tabela. No mobile: cards (componente dedicado). No desktop: respeita preferência.
  const [preferredViewMode, setPreferredViewMode] = useState<ViewMode>("table");
  const viewMode: ViewMode = preferredViewMode;

  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(null);
  const [detailSheet, setDetailSheet] = useState<{ id: number | null; open: boolean }>(
    { id: null, open: false }
  );
  const { toast } = useToast();

  const openComplaintDetail = useCallback((complaint: Complaint) => {
    setDetailSheet({ id: complaint.id, open: true });
  }, []);

  const { isResident } = useRole();
  const { user } = useAuth();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);

  const condoIdToFetch = currentCondominiumId || '';

  const { data: residents = [], isLoading: isLoadingResidents } = useResidents(
    condoIdToFetch,
    {}
  );

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

    const residentId = user?.residentId;

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
    } catch {
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
      } catch {
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
    } catch {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  const getStatusLabel = (status: ComplaintStatus): string => {
    const labels: Record<ComplaintStatus, string> = {
      NEW: "Novo",
      TRIAGE: "Triagem",
      IN_PROGRESS: "Em andamento",
      WAITING_USER: "Aguardando usuário",
      WAITING_THIRD_PARTY: "Aguardando terceiro",
      RESOLVED: "Resolvido",
      CLOSED: "Encerrado",
      CANCELLED: "Cancelado",
    };
    return labels[status] || status;
  };

  // Loading state
  if (isLoadingResidents || isLoadingComplaints) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <KanbanCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // No condominium selected
  if (!currentCondominiumId && user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="p-6 sm:p-8 max-w-md text-center">
          <CardContent className="space-y-3">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
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
        condominiumId={currentCondominiumId || ""}
      />
    );
  }

  // Contadores para o header admin
  const openCount = complaints.filter((c) =>
    ["NEW", "TRIAGE", "IN_PROGRESS", "WAITING_USER", "WAITING_THIRD_PARTY"].includes(c.status)
  ).length;
  const resolvedCount = complaints.filter((c) =>
    ["RESOLVED", "CLOSED"].includes(c.status)
  ).length;

  // Admin/Syndic view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6 pb-3 sm:pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Ocorrências
            </h2>
            <p className="text-sm text-muted-foreground">
              {complaints.length} ocorrência{complaints.length !== 1 ? "s" : ""} registrada{complaints.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Toggle: só no desktop */}
          {!isMobile && (
            <ComplaintViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setPreferredViewMode}
            />
          )}
        </div>

        {/* Resumo rápido - só desktop */}
        {!isMobile && complaints.length > 0 && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-warning">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{openCount}</span>
              <span className="text-muted-foreground">abertas</span>
            </div>
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{resolvedCount}</span>
              <span className="text-muted-foreground">resolvidas</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isMobile ? (
          /* Mobile: Card list */
          <div className="px-4 pb-4">
            <AdminComplaintsMobileList
              complaints={complaints}
              residents={residents}
              onComplaintClick={openComplaintDetail}
            />
          </div>
        ) : viewMode === "kanban" ? (
          /* Desktop: Kanban */
          <AdminComplaintsKanbanPage
            complaints={complaints}
            residents={residents}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onComplaintClick={openComplaintDetail}
          />
        ) : (
          /* Desktop: Table (default) */
          <AdminComplaintsTablePage
            complaints={complaints}
            residents={residents}
            onStatusChange={handleStatusChange}
            onComplaintClick={openComplaintDetail}
          />
        )}
      </div>

      <ComplaintDetailSheet
        complaintId={detailSheet.id}
        open={detailSheet.open}
        onOpenChange={(open) => setDetailSheet((prev) => ({ ...prev, open }))}
      />
    </div>
  );
}
