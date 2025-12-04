/**
 * History Feature - Type Definitions
 * Histórico de ações e mensagens enviadas
 */

import type {
  MessageType,
  MessageScope,
  WhatsAppStatus,
} from "@/features/messages/types";
import type { UserRole } from "@/types/user";

/**
 * Tipo de evento no histórico
 */
export type HistoryEventType =
  | "MESSAGE_SENT"
  | "COMPLAINT_CREATED"
  | "COMPLAINT_STATUS_CHANGED"
  | "RESIDENT_CREATED"
  | "RESIDENT_UPDATED"
  | "RESIDENT_DELETED"
  | "STRUCTURE_UPDATED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "SETTINGS_CHANGED";

/**
 * Severidade do evento
 */
export type EventSeverity = "INFO" | "WARNING" | "ERROR" | "SUCCESS";

/**
 * Item do histórico (genérico)
 */
export interface HistoryLogEntry {
  id: string;
  condominiumId: string;
  eventType: HistoryEventType;
  severity: EventSeverity;
  description: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Histórico de mensagem enviada
 */
export interface MessageHistory {
  id: string;
  condominiumId: string;
  type: MessageType;
  scope: MessageScope;
  targetTower?: string | null;
  targetFloor?: string | null;
  targetUnit?: string | null;
  content: string;
  recipientCount: number;
  whatsappStatus: WhatsAppStatus;
  sentBy: string;
  sentByName?: string;
  sentAt: string;
}

/**
 * Filtros para histórico
 */
export interface HistoryFilters {
  eventType?: HistoryEventType;
  severity?: EventSeverity;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
}

/**
 * Filtros para histórico de mensagens
 */
export interface MessageHistoryFilters {
  type?: MessageType;
  scope?: MessageScope;
  sentBy?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Estatísticas do histórico
 */
export interface HistoryStats {
  totalEvents: number;
  byEventType: Record<HistoryEventType, number>;
  bySeverity: Record<EventSeverity, number>;
  last7Days: number;
  last30Days: number;
}
