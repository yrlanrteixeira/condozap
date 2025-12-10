export type MessageTargetScope = "ALL" | "TOWER" | "FLOOR" | "UNIT";

export interface MessageTarget {
  scope: MessageTargetScope;
  tower?: string;
  floor?: string;
  unit?: string;
}

export interface MessageContent {
  text: string;
}

export type MessageType = "TEXT" | "TEMPLATE" | "IMAGE";

export interface SendMessageBody {
  condominium_id: string;
  type: MessageType;
  content: MessageContent;
  target: MessageTarget;
  sentBy?: string;
}

export interface MessagesParams {
  condominiumId: string;
}

export interface MessagesQuery {
  limit?: number;
}

