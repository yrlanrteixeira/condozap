import type { ChatMessage } from "../../hooks/useComplaintChatApi";
import type { ComplaintStatus } from "../../types";

export type ChatVariant = "resident" | "admin";

export type PillKind = "status" | "nudge" | "return" | "reopen" | "autoclose" | "comment";

export interface DateSeparatorItem {
  kind: "date";
  id: string;
  date: Date;
}

export interface PillItem {
  kind: "pill";
  id: string;
  pillKind: PillKind;
  label: string;
  notes?: string;
  status?: ComplaintStatus;
  date: Date;
}

export interface BubbleItem {
  kind: "bubble";
  id: string;
  message: ChatMessage;
  isOwn: boolean;
  isSynthetic: boolean;
  isFirstInCluster: boolean;
  isLastInCluster: boolean;
  date: Date;
}

export type FeedItem = DateSeparatorItem | PillItem | BubbleItem;
