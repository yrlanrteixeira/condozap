import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Badge } from "@/shared/components/ui/badge";
import {
  ArrowRight,
  Calendar,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/components/ui/use-toast";
import { useAuth } from "@/shared/hooks/useAuth";
import { useComplaint, useAddComplaintComment } from "../hooks/useComplaintsApi";
import { ComplaintStatusBadge } from "./ComplaintStatusBadge";
import { formatDateTime } from "@/shared/utils/helpers";
import type {
  ComplaintDetail,
  ComplaintStatus,
  ComplaintStatusHistory,
  ComplaintAttachment,
} from "../types";

const ACTION_COMMENT = "COMMENT";

/**
 * Maps ComplaintStatus to a user-friendly Portuguese label.
 */
const STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: "Novo",
  TRIAGE: "Triagem",
  IN_PROGRESS: "Em atendimento",
  WAITING_USER: "Aguardando usuario",
  WAITING_THIRD_PARTY: "Aguardando terceiro",
  RESOLVED: "Resolvido",
  CLOSED: "Encerrado",
  CANCELLED: "Cancelado",
};

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
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: complaint, isLoading } = useComplaint(complaintId ?? 0);
  const addComment = useAddComplaintComment();

  const handleAddComment = async () => {
    if (!complaintId || !commentText.trim()) return;
    try {
      await addComment.mutateAsync({
        id: complaintId,
        notes: commentText.trim(),
      });
      setCommentText("");
      toast({
        title: "Comentario enviado",
        description: "A administracao sera notificada.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Nao foi possivel enviar o comentario. Tente novamente.",
        variant: "error",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <SheetTitle className="text-left">
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
                <ResidentComplaintBody
                  complaint={complaint as ComplaintDetail}
                  currentUserId={user?.id}
                  currentResidentId={user?.residentId}
                />
              </div>
            </ScrollArea>

            {/* Sticky comment form at bottom */}
            <div className="p-4 border-t bg-muted/30 shrink-0">
              <label className="text-sm font-medium text-foreground block mb-2">
                Enviar mensagem
              </label>
              <Textarea
                placeholder="Escreva sua mensagem..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[72px] mb-2 resize-none"
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
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar comentario
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Body content (description, attachments, timeline)
// ---------------------------------------------------------------------------

function ResidentComplaintBody({
  complaint,
  currentUserId,
  currentResidentId,
}: {
  complaint: ComplaintDetail;
  currentUserId?: string;
  currentResidentId?: string;
}) {
  const history = complaint.statusHistory ?? [];
  const attachments = complaint.attachments ?? [];

  // Sort history newest first
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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

      {/* Full Timeline */}
      <section>
        <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Historico
        </p>

        {sortedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
            <FileText className="h-6 w-6 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              Nenhuma atualizacao ainda
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedHistory.map((entry) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                currentUserId={currentUserId}
                currentResidentId={currentResidentId}
                complaintResidentId={complaint.residentId}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Entry
// ---------------------------------------------------------------------------

function TimelineEntry({
  entry,
  currentUserId,
  currentResidentId,
  complaintResidentId,
}: {
  entry: ComplaintStatusHistory;
  currentUserId?: string;
  currentResidentId?: string;
  complaintResidentId: string;
}) {
  const isComment = entry.action === ACTION_COMMENT;

  // Determine if the entry was made by the current resident.
  // changedBy may contain the user id or the resident id.
  const isOwnEntry =
    (currentUserId && entry.changedBy === currentUserId) ||
    (currentResidentId && entry.changedBy === currentResidentId) ||
    entry.changedBy === complaintResidentId;

  if (isComment) {
    return (
      <li
        className={cn(
          "text-sm rounded-lg p-3 border",
          isOwnEntry
            ? "bg-muted/50 border-border"
            : "bg-primary/5 border-primary/20"
        )}
      >
        <div className="flex justify-between items-start gap-2 mb-1">
          <span
            className={cn(
              "text-xs font-semibold rounded-full px-2 py-0.5",
              isOwnEntry
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {isOwnEntry ? "Voce" : "Administracao"}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDateTime(entry.createdAt)}
          </span>
        </div>
        {entry.notes && (
          <p className="text-muted-foreground whitespace-pre-wrap mt-1.5 leading-relaxed">
            {entry.notes}
          </p>
        )}
      </li>
    );
  }

  // Status change entry
  return (
    <li className="text-sm rounded-lg p-3 border bg-muted/30 border-border">
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          <span>
            Status alterado para{" "}
            <span className="font-medium text-foreground">
              {STATUS_LABELS[entry.toStatus] ?? entry.toStatus}
            </span>
          </span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDateTime(entry.createdAt)}
        </span>
      </div>
      {entry.notes && (
        <p className="text-muted-foreground whitespace-pre-wrap mt-1.5 ml-5 leading-relaxed">
          {entry.notes}
        </p>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Attachment Item
// ---------------------------------------------------------------------------

function AttachmentItem({ attachment }: { attachment: ComplaintAttachment }) {
  const sizeLabel = formatFileSize(attachment.fileSize);

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
