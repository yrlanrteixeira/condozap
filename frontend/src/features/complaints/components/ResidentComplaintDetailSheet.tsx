import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Badge } from "@/shared/components/ui/badge";
import {
  Calendar,
  Download,
  FileText,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from "@/lib/api";

import { useComplaint } from "../hooks/useComplaintsApi";
import { useSendComplaintMessage } from "../hooks/useComplaintChatApi";
import { ComplaintStatusBadge } from "./ComplaintStatusBadge";
import { ComplaintTimeline } from "./ComplaintTimeline";
import { AudioPlayer } from "@/shared/components/AudioPlayer";
import { ProxiedImage } from "@/shared/components/ProxiedImage";
import { formatDateTime } from "@/shared/utils/helpers";
import { queryKeys } from "../utils/queryKeys";
import type {
  ComplaintDetail,
  ComplaintStatus,
  ComplaintAttachment,
} from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REOPEN_DEADLINE_DAYS = 7;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResidentComplaintDetailSheetProps {
  complaintId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ResidentComplaintDetailSheet({
  complaintId,
  open,
  onOpenChange,
}: ResidentComplaintDetailSheetProps) {
  const [commentText, setCommentText] = useState("");
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: complaint, isLoading } = useComplaint(complaintId ?? 0);
  const sendMessage = useSendComplaintMessage();

  // Complement mutation — called when status is RETURNED
  const complementMutation = useMutation({
    mutationFn: async ({
      complaintId: id,
      message,
    }: {
      complaintId: number;
      message: string;
    }) => {
      const { data } = await api.post(`/api/complaints/${id}/complement`, {
        message,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      toast({
        title: "Complemento enviado",
        variant: "success",
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Nao foi possivel enviar o complemento. Tente novamente.",
        variant: "error",
      });
    },
  });

  // Reopen mutation
  const reopenMutation = useMutation({
    mutationFn: async ({
      complaintId: id,
      reason,
    }: {
      complaintId: number;
      reason: string;
    }) => {
      const { data } = await api.post(`/api/complaints/${id}/reopen`, {
        reason,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      setReopenDialogOpen(false);
      setReopenReason("");
      toast({
        title: "Ocorrencia reaberta",
        variant: "success",
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Nao foi possivel reabrir a ocorrencia. Tente novamente.",
        variant: "error",
      });
    },
  });

  // Whether the resident can reopen: CLOSED + within deadline
  const canReopen =
    complaint?.status === "CLOSED" &&
    complaint.closedAt != null &&
    Date.now() - new Date(complaint.closedAt).getTime() <
      REOPEN_DEADLINE_DAYS * 24 * 60 * 60 * 1000;

  const handleAddComment = async () => {
    if (!complaintId || !commentText.trim()) return;

    try {
      if (complaint?.status === "RETURNED") {
        await complementMutation.mutateAsync({
          complaintId,
          message: commentText.trim(),
        });
      } else {
        await sendMessage.mutateAsync({
          complaintId,
          content: commentText.trim(),
        });
        toast({
          title: "Mensagem enviada",
          description: "A administração será notificada.",
          variant: "success",
        });
      }
      setCommentText("");
    } catch {
      if (complaint?.status !== "RETURNED") {
        toast({
          title: "Erro",
          description: "Não foi possível enviar a mensagem. Tente novamente.",
          variant: "error",
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const isSending = sendMessage.isPending || complementMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[100dvw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col p-0 h-[100dvh] sm:h-[85vh] sm:mt-[7.5vh]"
        >
          {/* Header */}
          <SheetHeader className="p-4 border-b shrink-0">
            <div className="flex items-center justify-between gap-3 pr-6">
              <SheetTitle className="text-left text-lg sm:text-xl">
                {complaintId ? `Ocorrencia #${complaintId}` : "Detalhe"}
              </SheetTitle>
              {complaint && (
                <ComplaintStatusBadge
                  status={complaint.status as ComplaintStatus}
                  size="sm"
                />
              )}
            </div>
            <SheetDescription className="sr-only">
              Detalhes da ocorrencia e historico de atualizacoes
            </SheetDescription>
          </SheetHeader>

          {/* Content */}
          {!complaintId ? (
            <div className="p-4 text-muted-foreground text-sm">
              Selecione uma ocorrencia para ver os detalhes.
            </div>
          ) : isLoading || !complaint ? (
            <div className="flex items-center justify-center flex-1 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1">
                <div className="px-4">
                  {/* Reopen button — shown when within deadline */}
                  {canReopen && (
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReopenDialogOpen(true)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reabrir Ocorrencia
                      </Button>
                    </div>
                  )}

                  <ResidentComplaintBody
                    complaint={complaint as ComplaintDetail}
                  />
                </div>
              </ScrollArea>

              {/* Sticky comment / complement form at bottom */}
              <div className="p-4 border-t bg-muted/30 shrink-0">
                {/* RETURNED alert */}
                {complaint.status === "RETURNED" && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
                    <p className="text-sm text-orange-500 font-medium">
                      Esta ocorrencia foi devolvida e aguarda seu complemento
                    </p>
                  </div>
                )}

                <label className="text-sm font-medium text-foreground block mb-2">
                  {complaint.status === "RETURNED"
                    ? "Enviar complemento"
                    : "Enviar mensagem"}
                </label>
                <Textarea
                  placeholder={
                    complaint.status === "RETURNED"
                      ? "Descreva o complemento solicitado..."
                      : "Escreva sua mensagem..."
                  }
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[72px] mb-2 resize-none"
                  disabled={isSending}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isSending}
                  className="w-full"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {complaint.status === "RETURNED"
                    ? "Enviar complemento"
                    : "Enviar comentario"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reopen Confirmation Dialog */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="w-[95%] sm:max-w-lg max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Reabrir Ocorrência</DialogTitle>
            <DialogDescription>
              Informe o motivo da reabertura da ocorrência.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da reabertura (minimo 10 caracteres)..."
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReopenDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (complaintId) {
                  reopenMutation.mutate({
                    complaintId,
                    reason: reopenReason,
                  });
                }
              }}
              disabled={reopenReason.length < 10 || reopenMutation.isPending}
            >
              {reopenMutation.isPending ? "Reabrindo..." : "Reabrir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Body content (description, attachments, timeline)
// ---------------------------------------------------------------------------

function ResidentComplaintBody({ complaint }: { complaint: ComplaintDetail }) {
  const attachments = complaint.attachments ?? [];

  return (
    <div className="space-y-5 py-4">
      {/* Description section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs uppercase">
            {complaint.category}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateTime(complaint.createdAt)}
          </span>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-1">Descricao</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {complaint.content}
          </p>
        </div>

        {complaint.sector && (
          <p className="text-xs text-muted-foreground">
            Setor: <span className="font-medium">{complaint.sector.name}</span>
          </p>
        )}

        {(complaint.responseDueAt || complaint.resolutionDueAt) && (
          <div className="text-xs text-muted-foreground space-y-1 rounded-md bg-muted/40 p-2.5">
            {complaint.responseDueAt && (
              <p>Previsao de resposta: {formatDateTime(complaint.responseDueAt)}</p>
            )}
            {complaint.resolutionDueAt && (
              <p>Previsao de resolucao: {formatDateTime(complaint.resolutionDueAt)}</p>
            )}
          </div>
        )}
      </section>

      {/* Attachments section */}
      {attachments.length > 0 && (
        <section>
          <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Anexos ({attachments.length})
          </p>
          <ul className="space-y-2">
            {attachments.map((attachment) => (
              <AttachmentItem key={attachment.id} attachment={attachment} />
            ))}
          </ul>
        </section>
      )}

      {/* Timeline / Acompanhamento */}
      {(complaint.statusHistory && complaint.statusHistory.length > 0) || (complaint.messages && complaint.messages.length > 0) ? (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Acompanhamento</h4>
          <ComplaintTimeline
            statusHistory={complaint.statusHistory || []}
            createdAt={complaint.createdAt}
            description={complaint.content}
            sectorName={complaint.sector?.name}
            complaintMessages={complaint.messages}
          />
        </section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attachment Item
// ---------------------------------------------------------------------------

function AttachmentItem({ attachment }: { attachment: ComplaintAttachment }) {
  const sizeLabel = formatFileSize(attachment.fileSize);

  if (attachment.fileType.startsWith("audio/")) {
    return (
      <li>
        <div
          className={cn(
            "flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3",
            "hover:bg-muted/60 transition-colors"
          )}
        >
          <p className="text-sm font-medium text-foreground truncate">
            {attachment.fileName}
          </p>
          <AudioPlayer src={attachment.fileUrl} className="w-full" />
          <p className="text-xs text-muted-foreground">
            {sizeLabel}
          </p>
        </div>
      </li>
    );
  }

  if (attachment.fileType.startsWith("image/")) {
    return (
      <li>
        <div
          className={cn(
            "flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3",
            "hover:bg-muted/60 transition-colors"
          )}
        >
          <p className="text-sm font-medium text-foreground truncate">
            {attachment.fileName}
          </p>
          <ProxiedImage src={attachment.fileUrl} className="w-full max-h-48" />
          <p className="text-xs text-muted-foreground">{sizeLabel}</p>
        </div>
      </li>
    );
  }

  return (
    <li>
      <a
        href={attachment.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3",
          "hover:bg-muted/60 transition-colors group"
        )}
      >
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {attachment.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {sizeLabel}
          </p>
        </div>
        <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </a>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
