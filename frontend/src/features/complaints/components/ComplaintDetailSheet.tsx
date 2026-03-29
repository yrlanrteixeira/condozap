import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
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
  const [commentText, setCommentText] = useState("");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: complaint, isLoading } = useComplaint(complaintId ?? 0);
  const addComment = useAddComplaintComment();
  const updateStatus = useUpdateComplaintStatus();
  const nudgeMutation = useNudgeComplaint();

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
              />
            </ScrollArea>

            {/* Form: Adicionar comentário */}
            <div className="p-4 border-t bg-muted/30 shrink-0">
              <label className="text-sm font-medium text-foreground block mb-2">
                Registrar andamento
              </label>
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
}: {
  complaint: ComplaintDetail;
  onStatusChange: (status: string) => void;
  isUpdatingStatus: boolean;
  currentUserId: string;
  onNudge: () => void;
  isNudgePending: boolean;
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
              {STATUS_OPTIONS.map((opt) => {
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
