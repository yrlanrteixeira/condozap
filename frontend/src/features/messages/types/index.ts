/**
 * Messages Feature - Type Definitions
 */

export type MessageType = 'TEXT' | 'TEMPLATE' | 'IMAGE'
export type MessageScope = 'ALL' | 'TOWER' | 'FLOOR' | 'UNIT'
export type WhatsAppStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export interface Message {
  id: string
  condominiumId: string
  type: MessageType
  scope: MessageScope
  targetTower?: string | null
  targetFloor?: string | null
  targetUnit?: string | null
  content: string
  whatsappMessageId?: string | null
  whatsappStatus: WhatsAppStatus
  batchId?: string | null
  recipientCount: number
  sentBy: string
  sentAt: string
}

export interface SendMessageInput {
  condominium_id: string
  type: MessageType
  scope: MessageScope
  target_tower?: string
  target_floor?: string
  target_unit?: string
  content: string
  sent_by: string
}

export interface SendWhatsAppMessageInput {
  to: string
  message: string
  condominiumId: string
}

export interface SendBulkMessagesInput {
  condominium_id: string
  recipients: Array<{
    phone: string
    name: string
  }>
  message: string
}

export interface MessageFilters {
  type?: MessageType
  scope?: MessageScope
  sentBy?: string
  limit?: number
}

export interface MessageStats {
  totalMessages: number
  totalRecipients: number
  deliveredCount: number
  readCount: number
  failedCount: number
  deliveryRate: number
  readRate: number
}

export interface MessageStatsPeriod {
  startDate?: string
  endDate?: string
}

/**
 * Dados de segmentação para envio de mensagens
 */
export interface TargetData {
  scope: MessageScope
  tower?: string
  floor?: string
  unit?: string
}

/**
 * Conteúdo de mensagem (texto, template ou imagem)
 */
export interface MessageContent {
  text?: string
  templateName?: string
  components?: unknown[] // Para templates do WhatsApp
  mediaUrl?: string
  caption?: string
}
