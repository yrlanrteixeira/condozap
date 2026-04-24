import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  MessageSquare,
  User,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  Bell,
  Undo2,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  useComplaint,
  useUpdateComplaintStatus,
  useNudgeComplaint,
  useAssignComplaint,
} from "../hooks/useComplaintsApi";
import { useSectors } from "@/features/structure/hooks/useSectorsApi";
import { ComplaintStatusBadge } from "./ComplaintStatusBadge";
import { ComplaintAttachmentUpload } from "./ComplaintAttachmentUpload";
import { ComplaintChat } from "./ComplaintChat";
import { CsatDisplay } from "./CsatDisplay";
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from "@/lib/api";
import type { ComplaintDetail, ComplaintStatus } from "../types";
import { formatDateTime } from "@/shared/utils/helpers";

const ACTION_COMMENT = "COMMENT";

const STATUS_OPTIONS: { value: ComplaintStatus; label: string; icon: typeof AlertTriangle }[] = [
  { value: "TRIAGE", label: "Triagem", icon: AlertTriangle },
  { value: "IN_PROGRESS", label: "Em andamento", icon: Clock },
  { value: "WAITING_USER", label: "Aguardando usuário", icon: Clock },
  { value: "WAITING_THIRD_PARTY", label: "Aguardando terceiro", icon: Clock },
  { value: "RESOLVED", label: "Resolvido", icon: CheckCircle },
  { value: "CLOSED", label: "Encerrado", icon: CheckCircle },
  { value: "CANCELLED", label: "Cancelado", icon: AlertTriangle },
];

interface ComplaintDetailSheetProps {
  complaintId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComplaintDetailSheet({
  complaintId,
  open,
  onOpenChange,
}: ComplaintDetailSheetProps) {
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: complaint, isLoading } = useComplaint(complaintId ?? 0);
  const updateStatus = useUpdateComplaintStatus();
  const assignMutation = useAssignComplaint();
  const nudgeMutation = useNudgeComplaint();
  const { data: sectors = [] } = useSectors(complaint?.condominiumId || "");

  const returnMutation = useMutation({
    mutationFn: async ({ complaintId, reason }: { complaintId: number; reason: string }) => {
      const { data } = await api.post(`/complaints/${complaintId}/return`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      setReturnDialogOpen(false);
      setReturnReason("");
      toast({ title: "Ocorrência devolvida", description: "O morador foi notificado.", variant: "success", duration: 3000 });
    },
  });

  // Permission flags for SETOR_MEMBER users
  const isSectorMember = currentUser?.role === "SETOR_MEMBER";
  const sectorPermissions =
    currentUser?.sectors
      ?.find((s) => s.sectorId === complaint?.sectorId)
      ?.permissions ?? [];

  const canChangeStatus = !isSectorMember || sectorPermissions.includes("CHANGE_STATUS");
  const canResolve = !isSectorMember || sectorPermissions.includes("RESOLVE");
  const canReturn = !isSectorMember || sectorPermissions.includes("RETURN");
  const canReassign = !isSectorMember || sectorPermissions.includes("REASSIGN");

  // Logic to determine which sectors the user can forward this complaint to:
  // 1. SYNDIC/ADMIN can see all.
  // 2. SETOR_MEMBER can see Administration, + whatever the current complaint's sector allows.
  const isGlobalAdmin = ["SYNDIC", "PROFESSIONAL_SYNDIC", "ADMIN", "SUPER_ADMIN"].includes(currentUser?.role || "");
  let allowedSectors = sectors;
  if (!isGlobalAdmin) {
    const currentSector = sectors.find(s => s.id === complaint?.sectorId);
    const allowedIds = currentSector?.allowedForwardingIds ?? [];
    allowedSectors = sectors.filter(s => allowedIds.includes(s.id));
  }

  const handleAssignSector = async (newSectorId: string) => {
    if (!complaintId) return;
    try {
      // Usamos "_admin" como string mágica no value do select para representar sectorId=null
      const targetSectorId = newSectorId === "_admin" ? null : newSectorId;
      await assignMutation.mutateAsync({
        id: complaintId,
        sectorId: targetSectorId as any,
      });
      toast({
        title: "Ocorrência encaminhada!",
        description: "Setor atribuído com sucesso.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível encaminhar a ocorrência.",
        variant: "destructive",
      });
    }
  };

  const handleNudge = async () => {
    if (!complaintId) return;
    try {
      const result = await nudgeMutation.mutateAsync(complaintId);
      toast({
        title: "Cobrança enviada",
        description: `${result.notifiedCount} membro(s) do setor notificado(s).`,
        variant: "success",
        duration: 3000,
      });
    } catch {
      toast({
        title: "Erro ao cobrar setor",
        description: "Não foi possível enviar a cobrança. Tente novamente.",
        variant: "error",
        duration: 3000,
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!complaintId) return;
    try {
      await updateStatus.mutateAsync({
        id: complaintId,
        status: newStatus as ComplaintStatus,
      });
      toast({
        title: "Status atualizado!",
        description: "O morador será notificado automaticamente.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[100dvw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl flex flex-col p-0 h-[100dvh] sm:h-[85vh] sm:rounded-xl overflow-hidden"
      >
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-left text-lg sm:text-xl">
            {complaintId ? `Ocorrência #${complaintId}` : "Detalhe"}
          </DialogTitle>
        </DialogHeader>

        {!complaintId ? (
          <div className="p-4 text-muted-foreground text-sm">
            Selecione uma ocorrência para ver os detalhes.
          </div>
        ) : isLoading || !complaint ? (
          <div className="flex items-center justify-center flex-1 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ComplaintDetailContent
              complaint={complaint as ComplaintDetail}
              onStatusChange={handleStatusChange}
              isUpdatingStatus={updateStatus.isPending}
              currentUserId={currentUser?.id ?? ""}
              onNudge={handleNudge}
              isNudgePending={nudgeMutation.isPending}
              onReturnClick={() => setReturnDialogOpen(true)}
              canChangeStatus={canChangeStatus}
              canResolve={canResolve}
              canReturn={canReturn}
              canReassign={canReassign}
              sectors={sectors}
              allowedSectors={allowedSectors}
              onSectorChange={handleAssignSector}
              isAssigning={assignMutation.isPending}
            />

            {/* Return dialog */}
            <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
              <DialogContent className="w-[95%] sm:max-w-lg max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Devolver Ocorrência</DialogTitle>
                  <DialogDescription>
                    Informe o motivo da devolução da ocorrência.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Motivo da devolução (mínimo 10 caracteres)..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="min-h-[100px]"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => complaintId && returnMutation.mutate({ complaintId, reason: returnReason })}
                    disabled={returnReason.length < 10 || returnMutation.isPending}
                  >
                    {returnMutation.isPending ? "Devolvendo..." : "Devolver"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ComplaintDetailContent({
  complaint,
  onStatusChange,
  isUpdatingStatus,
  currentUserId,
  onNudge,
  isNudgePending,
  onReturnClick,
  canChangeStatus,
  canResolve,
  canReturn,
  canReassign,
  sectors,
  allowedSectors,
  onSectorChange,
  isAssigning,
}: {
  complaint: ComplaintDetail;
  onStatusChange: (status: string) => void;
  isUpdatingStatus: boolean;
  currentUserId: string;
  onNudge: () => void;
  isNudgePending: boolean;
  onReturnClick: () => void;
  canChangeStatus: boolean;
  canResolve: boolean;
  canReturn: boolean;
  canReassign: boolean;
  sectors: { id: string; name: string }[];
  allowedSectors: { id: string; name: string }[];
  onSectorChange: (sectorId: string) => void;
  isAssigning: boolean;
}) {
  const attachments = complaint.attachments ?? [];
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Cabeçalho Compacto (Sempre visível) */}
      <div className="px-4 py-3 bg-background flex flex-col gap-2 shrink-0 border-b relative z-10 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ComplaintStatusBadge status={complaint.status as ComplaintStatus} size="sm" />
            <Badge variant="outline" className="text-xs">{complaint.sector?.name || "Administração"}</Badge>
            {complaint.priority && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  complaint.priority === "CRITICAL"
                    ? "border-red-500 text-red-600 dark:text-red-400"
                    : complaint.priority === "HIGH"
                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                    : ""
                }`}
              >
                {complaint.priority === "CRITICAL" ? "Crítica" : complaint.priority === "HIGH" ? "Alta" : "Normal"}
              </Badge>
            )}
          </div>
          {complaint.resident && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
              <User className="h-3.5 w-3.5" />
              <span>
                {complaint.resident.name.split(" ")[0]} – Unid. {complaint.resident.unit}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Accordion Toggle para Detalhes e Gestão */}
      <div className="bg-background border-b shrink-0 z-10 flex flex-col">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`} />
          {showDetails ? "Ocultar Detalhes e Gestão" : "Expandir Detalhes e Gerenciar"}
        </button>

        {showDetails && (
          <div className="border-t bg-muted/10 max-h-[50vh] overflow-y-auto w-full">
            <div className="px-4 py-6 space-y-6 bg-background">
              
              {/* Descrição */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <MessageSquare className="h-4 w-4 text-primary" /> Descrição da Ocorrência
                </h4>
                <div className="bg-muted/30 border border-border p-3 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {complaint.content}
                </div>
              </div>

              {/* SLA Datas */}
              {(complaint.responseDueAt || complaint.resolutionDueAt) && (
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/50">
                  {complaint.responseDueAt && (
                     <div className="flex items-center gap-1">
                       <Clock className="w-3 h-3" /> Resposta até: {formatDateTime(complaint.responseDueAt)}
                     </div>
                  )}
                  {complaint.resolutionDueAt && (
                     <div className="flex items-center gap-1 text-primary/70 font-medium">
                       <CheckCircle className="w-3 h-3" /> Resolução: {formatDateTime(complaint.resolutionDueAt)}
                     </div>
                  )}
                </div>
              )}

              {/* Anexos */}
              <ComplaintAttachmentUpload
                complaintId={complaint.id}
                attachments={attachments}
                showDelete={false}
              />

              {/* Controles de Gestão */}
              {(canChangeStatus || canReassign || canNudge || canReturn) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <User className="h-4 w-4 text-primary" /> 
                    Controles de Atendimento
                  </h4>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Alterar Status */}
                    {canChangeStatus && (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Evoluir Status
                        </label>
                        <Select
                          value={complaint.status}
                          onValueChange={onStatusChange}
                          disabled={isUpdatingStatus}
                        >
                          <SelectTrigger className="h-9 w-full bg-muted/20">
                            <SelectValue placeholder="Selecione o novo status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.filter(
                              (opt) => canResolve || opt.value !== "RESOLVED"
                            ).map((opt) => {
                              const Icon = opt.icon;
                              return (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Icon size={14} className="text-muted-foreground" />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Mover Setor */}
                    {canReassign && allowedSectors.length > 0 && (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Encaminhar (Mover) Setor
                        </label>
                        <Select
                          value={complaint.sectorId || "_admin"}
                          onValueChange={onSectorChange}
                          disabled={isAssigning}
                        >
                          <SelectTrigger className="h-9 w-full bg-muted/20">
                            <SelectValue placeholder="Selecione o destino" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_admin">
                              <div className="flex items-center gap-2 text-sm">
                                <User size={14} className="text-muted-foreground" />
                                Administração
                              </div>
                            </SelectItem>
                            {allowedSectors.map((sector) => (
                              <SelectItem key={sector.id} value={sector.id}>
                                <div className="flex items-center gap-2 text-sm">
                                  <MessageSquare size={14} className="text-muted-foreground" />
                                  {sector.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Ações Especiais */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(() => {
                      const canNudge =
                        complaint.sectorId &&
                        !["RESOLVED", "CLOSED", "CANCELLED"].includes(complaint.status);
                      const nudgeCooldown =
                        complaint.lastNudgedAt &&
                        Date.now() - new Date(complaint.lastNudgedAt).getTime() <
                          24 * 60 * 60 * 1000;
                      return canNudge ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onNudge}
                          disabled={!!nudgeCooldown || isNudgePending}
                          className="flex-1 sm:flex-none border-primary/20 text-primary hover:bg-primary/5"
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          {nudgeCooldown ? "Setor Cobrado" : "Cobrar Posicionamento"}
                        </Button>
                      ) : null;
                    })()}

                    {canReturn && ["IN_PROGRESS", "TRIAGE"].includes(complaint.status) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onReturnClick}
                        className="flex-1 sm:flex-none"
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        Devolver ao Morador
                      </Button>
                    )}
                  </div>

                  {canChangeStatus && complaint.status === "REOPENED" && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-4 p-3 bg-red-50/50 border border-red-100 rounded-lg">
                      <Button size="sm" onClick={() => onStatusChange("IN_PROGRESS")} className="flex-1">
                        Retomar Atendimento
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onStatusChange("CANCELLED")} className="flex-1">
                        Rejeitar Reabertura
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Avaliação CSAT */}
              {(complaint.csatScore || ["RESOLVED", "CLOSED"].includes(complaint.status)) && (
                <div className="pt-4 border-t">
                  <CsatDisplay
                    score={complaint.csatScore ?? null}
                    comment={complaint.csatComment ?? null}
                    respondedAt={complaint.csatRespondedAt ?? null}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ÁREA DE CHAT (Sempre Visível) */}
      <div className="flex-1 p-4 pb-0 flex flex-col min-h-0 bg-background z-0 relative">
        {/* O Chat componente */}
        <ComplaintChat
          variant="admin"
          complaintId={complaint.id}
          currentUserId={currentUserId}
          complaint={complaint}
          statusHistory={complaint.statusHistory ?? []}
          showInternalToggle={true}
          defaultShowInternal={false}
        />
      </div>
    </div>
  );
}

