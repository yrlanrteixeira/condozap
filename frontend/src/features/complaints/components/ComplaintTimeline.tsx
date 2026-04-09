import { CheckCircle2, Circle, MessageSquare, ArrowRight, Bell, Clock, Undo2, RotateCcw, Timer } from "lucide-react";
import type { ComplaintStatusHistory, ComplaintMessage } from "../types";
import { cn } from "@/lib/utils";

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
  type: "created" | "status" | "comment" | "nudge" | "return" | "reopen" | "autoclose" | "chat";
  label: string;
  description?: string;
  date: string;
  completed: boolean;
  senderName?: string;
  senderRole?: string;
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

function TimelineIcon({ type, completed }: { type: TimelineItem["type"]; completed: boolean }) {
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

export function ComplaintTimeline({
  statusHistory,
  createdAt,
  description,
  sectorName,
}: ComplaintTimelineProps) {
  const items = buildTimelineItems(statusHistory, createdAt, description, sectorName);

  return (
    <div className="relative pl-6 space-y-4">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

      {items.map((item) => (
        <div key={item.id} className="relative flex gap-3">
          {/* Icon dot */}
          <div className="absolute -left-6 mt-0.5 bg-background p-0.5">
            <TimelineIcon type={item.type} completed={item.completed} />
          </div>

          {/* Content */}
          <div className={cn("flex-1 min-w-0", !item.completed && "opacity-50")}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{item.label}</span>
              <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5 break-words">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
