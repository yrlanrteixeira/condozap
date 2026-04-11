import type { ChatMessage } from "../../hooks/useComplaintChatApi";
import type {
  ComplaintDetail,
  ComplaintStatus,
  ComplaintStatusHistory,
} from "../../types";
import type {
  BubbleItem,
  ChatVariant,
  FeedItem,
  PillItem,
  PillKind,
} from "./types";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: "Nova",
  TRIAGE: "Triagem",
  IN_PROGRESS: "Em atendimento",
  WAITING_USER: "Aguardando usuário",
  WAITING_THIRD_PARTY: "Aguardando terceiro",
  RESOLVED: "Resolvida",
  CLOSED: "Encerrada",
  CANCELLED: "Cancelada",
  RETURNED: "Devolvida",
  REOPENED: "Reaberta",
};

const CLUSTER_GAP_MS = 5 * 60 * 1000;
const DEDUP_GAP_MS = 1000;

export interface BuildFeedItemsArgs {
  complaint: ComplaintDetail;
  messages: ChatMessage[];
  statusHistory: ComplaintStatusHistory[];
  variant: ChatVariant;
  currentUserId: string;
}

interface InternalBubble extends Omit<BubbleItem, "isFirstInCluster" | "isLastInCluster"> {}
interface InternalPill extends PillItem {}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildSyntheticMessage(args: {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
}): ChatMessage {
  return {
    id: args.id,
    senderId: args.senderId,
    senderRole: args.senderRole,
    senderName: args.senderName,
    content: args.content,
    attachmentUrl: args.attachmentUrl,
    source: "WEB",
    isInternal: false,
    whatsappStatus: null,
    whatsappMessageId: null,
    createdAt: args.createdAt,
  };
}

function makeOpeningBubbles(
  complaint: ComplaintDetail,
  messages: ChatMessage[],
  currentUserId: string,
): InternalBubble[] {
  const createdAt = toDate(complaint.createdAt);
  const residentId = complaint.residentId ?? "resident-unknown";
  const residentName = complaint.resident?.name ?? "Morador";

  // Dedup: if there is a real message from the resident within ±1s with the same content, skip.
  const realFirst = messages.find(
    (m) =>
      m.senderRole === "RESIDENT" &&
      m.content.trim() === complaint.content.trim() &&
      Math.abs(new Date(m.createdAt).getTime() - createdAt.getTime()) <= DEDUP_GAP_MS,
  );
  if (realFirst) {
    return [];
  }

  const bubbles: InternalBubble[] = [];
  const isOwn = residentId === currentUserId;

  bubbles.push({
    kind: "bubble",
    id: `synthetic-${complaint.id}-description`,
    message: buildSyntheticMessage({
      id: `synthetic-${complaint.id}-description`,
      senderId: residentId,
      senderRole: "RESIDENT",
      senderName: residentName,
      content: complaint.content,
      attachmentUrl: null,
      createdAt: complaint.createdAt,
    }),
    isOwn,
    isSynthetic: true,
    date: createdAt,
  });

  const attachments = complaint.attachments ?? [];
  attachments.forEach((att, idx) => {
    bubbles.push({
      kind: "bubble",
      id: `synthetic-${complaint.id}-attachment-${att.id ?? idx}`,
      message: buildSyntheticMessage({
        id: `synthetic-${complaint.id}-attachment-${att.id ?? idx}`,
        senderId: residentId,
        senderRole: "RESIDENT",
        senderName: residentName,
        content: att.fileName ?? "📎 Anexo",
        attachmentUrl: att.fileUrl ?? null,
        // Keep attachments in same cluster (within ms).
        createdAt: new Date(createdAt.getTime() + 1 + idx).toISOString(),
      }),
      isOwn,
      isSynthetic: true,
      date: new Date(createdAt.getTime() + 1 + idx),
    });
  });

  return bubbles;
}

function makeMessageBubbles(
  messages: ChatMessage[],
  variant: ChatVariant,
  currentUserId: string,
): InternalBubble[] {
  return messages
    .filter((m) => (variant === "resident" ? !m.isInternal : true))
    .map((m) => ({
      kind: "bubble" as const,
      id: `msg-${m.id}`,
      message: m,
      isOwn: m.senderId === currentUserId,
      isSynthetic: false,
      date: toDate(m.createdAt),
    }));
}

function makeCommentBubble(
  entry: ComplaintStatusHistory,
  currentUserId: string,
): InternalBubble {
  const authorId = entry.changedBy ?? "admin-unknown";
  const isOwn = authorId === currentUserId;
  return {
    kind: "bubble",
    id: `history-${entry.id}`,
    message: buildSyntheticMessage({
      id: `history-${entry.id}`,
      senderId: authorId,
      senderRole: "ADMIN",
      senderName: "Administração",
      content: entry.notes ?? "",
      attachmentUrl: null,
      createdAt: entry.createdAt,
    }),
    isOwn,
    isSynthetic: true,
    date: toDate(entry.createdAt),
  };
}

function makePill(entry: ComplaintStatusHistory): InternalPill | null {
  const date = toDate(entry.createdAt);
  const action = entry.action?.toUpperCase();

  if (action === "NUDGE") {
    return {
      kind: "pill",
      id: `pill-${entry.id}`,
      pillKind: "nudge",
      label: "Síndico cobrou atualização",
      notes: entry.notes,
      date,
    };
  }
  if (action === "RETURN") {
    return {
      kind: "pill",
      id: `pill-${entry.id}`,
      pillKind: "return",
      label: "Ocorrência devolvida ao morador",
      notes: entry.notes,
      date,
    };
  }
  if (action === "REOPEN") {
    return {
      kind: "pill",
      id: `pill-${entry.id}`,
      pillKind: "reopen",
      label: "Morador reabriu a ocorrência",
      notes: entry.notes,
      date,
    };
  }
  if (action === "AUTO_CLOSE") {
    return {
      kind: "pill",
      id: `pill-${entry.id}`,
      pillKind: "autoclose",
      label: "Encerrada automaticamente",
      notes: entry.notes,
      date,
    };
  }
  if (action === "COMMENT") {
    return {
      kind: "pill",
      id: `pill-${entry.id}`,
      pillKind: "comment",
      label: "Andamento Registrado",
      notes: entry.notes,
      date,
    };
  }

  // Plain status change
  if (entry.toStatus) {
    return {
      kind: "pill",
      id: `pill-${entry.id}`,
      pillKind: "status",
      label: (STATUS_LABELS[entry.toStatus] ?? entry.toStatus).toUpperCase(),
      notes: entry.notes,
      status: entry.toStatus,
      date,
    };
  }
  return null;
}

/**
 * Pure function producing an ordered list of feed items from raw complaint data.
 * - Merges the synthetic opening bubble (from complaint.content) with messages and status history.
 * - Filters internal messages when variant === "resident".
 * - Inserts DateSeparator items between items on different days.
 * - Annotates bubble clustering (isFirstInCluster / isLastInCluster).
 */
export function buildFeedItems(args: BuildFeedItemsArgs): FeedItem[] {
  const { complaint, messages, statusHistory, variant, currentUserId } = args;

  // 1. Opening bubble(s)
  const opening = makeOpeningBubbles(complaint, messages, currentUserId);

  // 2. Chat messages → bubbles
  const messageBubbles = makeMessageBubbles(messages, variant, currentUserId);

  // 3. Status history → pills
  const historyPills: InternalPill[] = [];
  for (const entry of statusHistory) {
    const pill = makePill(entry);
    if (pill) historyPills.push(pill);
  }

  // 4. Merge & sort by date ascending
  const merged: Array<InternalBubble | InternalPill> = [
    ...opening,
    ...messageBubbles,
    ...historyPills,
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // 5. Insert date separators and compute clusters in a single pass
  const result: FeedItem[] = [];
  let lastDate: Date | null = null;
  let lastBubble: BubbleItem | null = null;

  for (const item of merged) {
    // Date separator
    if (!lastDate || !sameDay(lastDate, item.date)) {
      result.push({
        kind: "date",
        id: `date-${item.date.toISOString().slice(0, 10)}`,
        date: item.date,
      });
      lastDate = item.date;
      lastBubble = null; // separator breaks cluster
    }

    if (item.kind === "pill") {
      result.push(item);
      lastBubble = null; // pill breaks cluster
      continue;
    }

    // Bubble: determine cluster
    const candidate: BubbleItem = {
      ...item,
      isFirstInCluster: true,
      isLastInCluster: true,
    };

    if (
      lastBubble &&
      lastBubble.message.senderId === item.message.senderId &&
      lastBubble.message.isInternal === item.message.isInternal &&
      lastBubble.isOwn === item.isOwn &&
      item.date.getTime() - lastBubble.date.getTime() <= CLUSTER_GAP_MS
    ) {
      candidate.isFirstInCluster = false;
      lastBubble.isLastInCluster = false;
    }

    result.push(candidate);
    lastBubble = candidate;
  }

  return result;
}
