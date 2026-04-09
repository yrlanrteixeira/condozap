import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  MessageSquare,
  User,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  Bell,
  FileText,
  Undo2,
} from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  useComplaint,
  useAddComplaintComment,
  useUpdateComplaintStatus,
  useNudgeComplaint,
} from "../hooks/useComplaintsApi";
import { ComplaintStatusBadge } from "./ComplaintStatusBadge";
import { ComplaintAttachmentUpload } from "./ComplaintAttachmentUpload";
import { ComplaintChat } from "./ComplaintChat";
import { CsatDisplay } from "./CsatDisplay";
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from "@/lib/api";
import type { ComplaintDetail, ComplaintStatus, CannedResponse } from "../types";
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
  const [commentText, setCommentText] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: complaint, isLoading } = useComplaint(complaintId ?? 0);
  const addComment = useAddComplaintComment();
  const updateStatus = useUpdateComplaintStatus();
  const nudgeMutation = useNudgeComplaint();

  const returnMutation = useMutation({
    mutationFn: async ({ complaintId, reason }: { complaintId: number; reason: string }) => {
      const { data } = await api.post(`/api/complaints/${complaintId}/return`, { reason });
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

  const canComment = !isSectorMember || sectorPermissions.includes("COMMENT");
  const canChangeStatus = !isSectorMember || sectorPermissions.includes("CHANGE_STATUS");
  const canResolve = !isSectorMember || sectorPermissions.includes("RESOLVE");
  const canReturn = !isSectorMember || sectorPermissions.includes("RETURN");
  const canReassign = !isSectorMember || sectorPermissions.includes("REASSIGN");

  const { data: cannedResponses = [] } = useQuery({
    queryKey: ["canned-responses", complaint?.condominiumId, complaint?.sectorId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (complaint?.condominiumId) params.set("condominiumId", complaint.condominiumId);
      if (complaint?.sectorId) params.set("sectorId", complaint.sectorId);
      const { data } = await api.get(`/canned-responses?${params}`);
      return data;
    },
    enabled: !!complaint,
  });

  const filteredTemplates = cannedResponses.filter((t: CannedResponse) =>
    t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.content.toLowerCase().includes(templateSearch.toLowerCase())
  );

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

  const handleAddComment = async () => {
    if (!complaintId || !commentText.trim()) return;
    try {
      await addComment.mutateAsync({ id: complaintId, notes: commentText.trim() });
      setCommentText("");
      toast({ title: "Comentário adicionado", description: "O morador será notificado.", variant: "success" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível adicionar o comentário.", variant: "destructive" });
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle className="text-left">
            {complaintId ? `Ocorrência #${complaintId}` : "Detalhe"}
          </SheetTitle>
        </SheetHeader>

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
            <ScrollArea className="flex-1 px-4">
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
              />
            </ScrollArea>

            {/* Return dialog */}
            <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Devolver Ocorrência</DialogTitle>
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

            {/* Form: Adicionar comentário — only for users with COMMENT permission */}
            {canComment && (
              <div className="p-4 border-t bg-muted/30 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Registrar andamento</label>
                  <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Templates
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="end">
                      <Input
                        placeholder="Buscar template..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {filteredTemplates.map((t: CannedResponse) => (
                          <button
                            key={t.id}
                            className="w-full text-left p-2 rounded hover:bg-muted text-sm"
                            onClick={() => {
                              setCommentText(t.content);
                              setTemplateOpen(false);
                              setTemplateSearch("");
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{t.title}</p>
                              {t.sector?.name && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t.sector.name}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                          </button>
                        ))}
                        {filteredTemplates.length === 0 && (
                          <p className="text-sm text-muted-foreground p-2 text-center">Nenhum template encontrado</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Textarea
                  placeholder="Descreva o que está sendo feito..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px] mb-2"
                  disabled={addComment.isPending}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addComment.isPending}
                  className="w-full"
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Adicionar comentário
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
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
}) {
  const history = complaint.statusHistory ?? [];
  const attachments = complaint.attachments ?? [];

  return (
    <div className="space-y-4 py-4">
      {/* Status + Ação de mudar status */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Status atual</span>
          <ComplaintStatusBadge status={complaint.status as ComplaintStatus} size="md" />
        </div>
        {canChangeStatus && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Alterar status
            </label>
            <Select
              value={complaint.status}
              onValueChange={onStatusChange}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter(
                  (opt) => canResolve || opt.value !== "RESOLVED"
                ).map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
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
      </div>

      {/* Nudge: cobrar posicionamento do setor */}
      {(() => {
        const canNudge =
          complaint.sectorId &&
          !["RESOLVED", "CLOSED", "CANCELLED"].includes(complaint.status);
        const nudgeCooldown =
          complaint.lastNudgedAt &&
          Date.now() - new Date(complaint.lastNudgedAt).getTime() <
            24 * 60 * 60 * 1000;
        return canNudge ? (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onNudge}
              disabled={!!nudgeCooldown || isNudgePending}
              title={
                nudgeCooldown
                  ? "Aguarde 24h entre cobranças"
                  : "Cobrar posicionamento do setor"
              }
            >
              <Bell className="h-4 w-4 mr-1" />
              {nudgeCooldown ? "Cobrado" : "Cobrar Setor"}
            </Button>
          </div>
        ) : null;
      })()}

      {/* Return to resident button */}
      {canReturn && ["IN_PROGRESS", "TRIAGE"].includes(complaint.status) && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onReturnClick}>
            <Undo2 className="h-4 w-4 mr-1" />
            Devolver ao Morador
          </Button>
        </div>
      )}

      {/* Reopen handling buttons */}
      {canChangeStatus && complaint.status === "REOPENED" && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onStatusChange("IN_PROGRESS")}>
            Retomar Atendimento
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onStatusChange("CANCELLED")}>
            Rejeitar Reabertura
          </Button>
        </div>
      )}

      {/* Categoria */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{complaint.category}</Badge>
        {complaint.priority && (
          <Badge
            variant="outline"
            className={
              complaint.priority === "CRITICAL"
                ? "border-red-500 text-red-600 dark:text-red-400"
                : complaint.priority === "HIGH"
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : ""
            }
          >
            {complaint.priority === "CRITICAL"
              ? "Crítica"
              : complaint.priority === "HIGH"
              ? "Alta"
              : complaint.priority === "MEDIUM"
              ? "Média"
              : "Baixa"}
          </Badge>
        )}
      </div>

      {/* Morador */}
      {complaint.resident && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>
            {complaint.resident.name} – Unid. {complaint.resident.unit} (
            {complaint.resident.tower})
          </span>
        </div>
      )}

      {/* Descrição */}
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Descrição</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {complaint.content}
        </p>
      </div>

      {complaint.sector && (
        <p className="text-sm text-muted-foreground">
          Setor: <span className="font-medium">{complaint.sector.name}</span>
        </p>
      )}

      {(complaint.responseDueAt || complaint.resolutionDueAt) && (
        <div className="text-xs text-muted-foreground space-y-1">
          {complaint.responseDueAt && (
            <p>Resposta até: {formatDateTime(complaint.responseDueAt)}</p>
          )}
          {complaint.resolutionDueAt && (
            <p>Resolução prevista: {formatDateTime(complaint.resolutionDueAt)}</p>
          )}
        </div>
      )}

      {/* Anexos */}
      <ComplaintAttachmentUpload
        complaintId={complaint.id}
        attachments={attachments}
      />

      {/* Chat */}
      <ComplaintChat
        complaintId={complaint.id}
        currentUserId={currentUserId}
        showInternalToggle={true}
        defaultShowInternal={false}
      />

      {/* CSAT */}
      {(complaint.csatScore || ["RESOLVED", "CLOSED"].includes(complaint.status)) && (
        <CsatDisplay
          score={complaint.csatScore ?? null}
          comment={complaint.csatComment ?? null}
          respondedAt={complaint.csatRespondedAt ?? null}
        />
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Histórico
          </p>
          <ul className="space-y-3">
            {history.map((entry) => (
              <li
                key={entry.id}
                className={`text-sm rounded-lg p-3 border ${
                  entry.action === ACTION_COMMENT
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium text-foreground">
                    {entry.action === ACTION_COMMENT
                      ? "Comentário"
                      : "Alteração de status"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                {entry.notes && (
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                    {entry.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
