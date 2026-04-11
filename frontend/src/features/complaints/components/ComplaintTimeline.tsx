import { useState, useEffect } from "react";
import { CheckCircle2, Circle, MessageSquare, ArrowRight, Bell, Clock, Undo2, RotateCcw, Timer, Loader2, ImageIcon, XCircle } from "lucide-react";
import type { ComplaintStatusHistory, ComplaintMessage } from "../types";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "@/shared/components/AudioPlayer";
import { api } from "@/lib/api";

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  status: string;
  errorMessage: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nova",
  OPEN: "Triagem",
  TRIAGE: "Triagem",
  IN_PROGRESS: "Em Andamento",
  WAITING_USER: "Aguardando Morador",
  WAITING_THIRD_PARTY: "Aguardando Terceiro",
  RESOLVED: "Resolvida",
  CLOSED: "Encerrada",
  CANCELLED: "Cancelada",
  RETURNED: "Devolvida",
  REOPENED: "Reaberta",
};

interface ComplaintTimelineProps {
  statusHistory: ComplaintStatusHistory[];
  createdAt: string;
  description: string;
  sectorName?: string;
  complaintMessages?: ComplaintMessage[];
}

interface TimelineItem {
  id: string;
  type: "created" | "status" | "comment" | "nudge" | "return" | "reopen" | "autoclose" | "chat" | "notification";
  label: string;
  description?: string;
  date: string;
  completed: boolean;
  senderName?: string;
  senderRole?: string;
  attachmentUrl?: string;
  isError?: boolean;
  errorMessage?: string;
}

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  status: string;
  errorMessage: string | null;
}

export function addActivityLogsToTimeline(
  items: TimelineItem[],
  activityLogs: ActivityLog[]
): TimelineItem[] {
  const notificationItems: TimelineItem[] = activityLogs
    .filter(log => 
      log.type === "MESSAGE_SENT" || 
      log.type === "MESSAGE_FAILED" || 
      log.type === "COMPLAINT_STATUS_CHANGED"
    )
    .map(log => {
      const isError = log.type === "MESSAGE_FAILED" || log.status === "failed";
      return {
        id: log.id,
        type: "notification" as const,
        label: log.type === "MESSAGE_SENT" 
          ? "Notificação WhatsApp" 
          : log.type === "MESSAGE_FAILED"
          ? "Notificação falhou"
          : log.type === "COMPLAINT_STATUS_CHANGED"
          ? "Status alterado (notificação)"
          : "Notificação",
        description: log.description,
        date: log.createdAt,
        completed: !isError,
        isError,
        errorMessage: log.errorMessage || undefined,
      };
    });

  if (notificationItems.length === 0) return items;

  const allItems = [...items, ...notificationItems].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return allItems;
}

function buildTimelineItems(
  statusHistory: ComplaintStatusHistory[],
  createdAt: string,
  description: string,
  sectorName?: string,
  complaintMessages?: ComplaintMessage[]
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // 1. Creation
  items.push({
    id: "created",
    type: "created",
    label: "Criada",
    description,
    date: createdAt,
    completed: true,
  });

  // 2. Chat messages
  if (complaintMessages && complaintMessages.length > 0) {
    const sortedMessages = [...complaintMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const msg of sortedMessages) {
      const senderLabel = msg.senderRole === "RESIDENT" ? "Morador" : msg.sender?.name || "Admin";
      items.push({
        id: msg.id,
        type: "chat",
        label: senderLabel,
        description: msg.content,
        date: msg.createdAt,
        completed: true,
        senderName: msg.sender?.name,
        senderRole: msg.senderRole,
        attachmentUrl: msg.attachmentUrl || undefined,
      });
    }
  }

  // 3. Status changes, comments, and nudges from history (sorted oldest first)
  const sorted = [...statusHistory].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const entry of sorted) {
    if (entry.action === "NUDGE") {
      items.push({
        id: entry.id,
        type: "nudge",
        label: "Cobrança de posicionamento",
        description: entry.notes || `Administração cobrou atualização do setor${sectorName ? ` ${sectorName}` : ""}`,
        date: entry.createdAt,
        completed: true,
      });
    } else if (entry.action === "COMMENT" || entry.action === "comment") {
      items.push({
        id: entry.id,
        type: "comment",
        label: "Comentário",
        description: entry.notes || "",
        date: entry.createdAt,
        completed: true,
      });
    } else if (entry.action === "RETURN") {
      items.push({
        id: entry.id, type: "return",
        label: "Devolvida ao morador",
        description: entry.notes || "",
        date: entry.createdAt, completed: true,
      });
    } else if (entry.action === "REOPEN") {
      items.push({
        id: entry.id, type: "reopen",
        label: "Reaberta pelo morador",
        description: entry.notes || "",
        date: entry.createdAt, completed: true,
      });
    } else if (entry.action === "AUTO_CLOSE") {
      items.push({
        id: entry.id, type: "autoclose",
        label: "Encerrada automaticamente",
        description: entry.notes || "",
        date: entry.createdAt, completed: true,
      });
    } else {
      // Status change
      const toLabel = STATUS_LABELS[entry.toStatus] || entry.toStatus;
      items.push({
        id: entry.id,
        type: "status",
        label: toLabel,
        description: entry.notes || undefined,
        date: entry.createdAt,
        completed: true,
      });
    }
  }

  return items;
}

function TimelineIcon({ type, completed, isError }: { type: TimelineItem["type"]; completed: boolean; isError?: boolean }) {
  const size = "h-4 w-4";
  if (!completed) return <Circle className={cn(size, "text-muted-foreground")} />;

  switch (type) {
    case "created":
      return <CheckCircle2 className={cn(size, "text-green-500")} />;
    case "status":
      return <ArrowRight className={cn(size, "text-blue-500")} />;
    case "comment":
      return <MessageSquare className={cn(size, "text-purple-500")} />;
    case "chat":
      return <MessageSquare className={cn(size, "text-indigo-500")} />;
    case "nudge":
      return <Bell className={cn(size, "text-amber-500")} />;
    case "return":
      return <Undo2 className={cn(size, "text-orange-500")} />;
    case "reopen":
      return <RotateCcw className={cn(size, "text-blue-500")} />;
    case "autoclose":
      return <Timer className={cn(size, "text-gray-500")} />;
    case "notification":
      if (isError) return <XCircle className={cn(size, "text-destructive")} />;
      return <CheckCircle2 className={cn(size, "text-success")} />;
    default:
      return <Clock className={cn(size, "text-muted-foreground")} />;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }) + " às " + date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImageUrl(url: string): boolean {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
}

function TimelineProxiedImage({ src }: { src: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/uploads/media-proxy", { params: { url: src }, responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        setBlobUrl(URL.createObjectURL(res.data));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (error || !blobUrl) return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
  return <img src={blobUrl} alt="Anexo" className="rounded max-h-32 object-contain" />;
}

interface ComplaintTimelineProps {
  statusHistory: ComplaintStatusHistory[];
  createdAt: string;
  description: string;
  sectorName?: string;
  complaintMessages?: ComplaintMessage[];
  activityLogs?: ActivityLog[];
}

export function ComplaintTimeline({
  statusHistory,
  createdAt,
  description,
  sectorName,
  complaintMessages,
  activityLogs,
}: ComplaintTimelineProps) {
  let items = buildTimelineItems(statusHistory, createdAt, description, sectorName, complaintMessages);
  
  if (activityLogs && activityLogs.length > 0) {
    items = addActivityLogsToTimeline(items, activityLogs);
  }

  return (
    <div className="relative pl-6 space-y-4">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

      {items.map((item) => (
        <div key={item.id} className="relative flex gap-3">
          {/* Icon dot */}
          <div className="absolute -left-6 mt-0.5 bg-background p-0.5">
            <TimelineIcon type={item.type} completed={item.completed} isError={item.isError} />
          </div>

          {/* Content */}
          <div className={cn("flex-1 min-w-0", !item.completed && "opacity-50")}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("font-medium text-sm", item.isError && "text-destructive")}>{item.label}</span>
              <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5 break-words">
                {item.description}
              </p>
            )}
            {item.errorMessage && (
              <p className="text-xs text-destructive mt-1 bg-destructive/10 p-2 rounded">
                Erro: {item.errorMessage}
              </p>
            )}
            {item.attachmentUrl && (
              <div className="mt-2">
                {isImageUrl(item.attachmentUrl) ? (
                  <TimelineProxiedImage src={item.attachmentUrl} />
                ) : (
                  <AudioPlayer src={item.attachmentUrl} className="w-full" />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
