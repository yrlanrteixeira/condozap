// ============================================
// TYPES SIMPLES - SEM CLASSES, SEM VALIDATORS
// ============================================

// Resident
export interface Resident {
  id: string
  name: string
  phone: string
  tower: string
  floor: string
  unit: string
}

// Complaint
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved'

export interface Complaint {
  id: number
  residentId: string
  category: string
  content: string
  status: ComplaintStatus
  timestamp: string
}

// Message
export type MessageType = 'text' | 'template' | 'image'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  id: number
  timestamp: string
  type: MessageType
  templateName?: string | null
  scope: string
  target: string
  phone?: string
  content: string
  payload?: WhatsAppPayload
  status: MessageStatus
}

// Template
export interface Template {
  name: string
  label: string
  language: string
  components: TemplateComponent[]
}

export interface TemplateComponent {
  type: string
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  type: string
  text?: string
  document?: { link: string }
  date_time?: string
}

// WhatsApp
export interface WhatsAppPayload {
  messaging_product: string
  recipient_type: string
  to: string
  type: string
  text?: { preview_url: boolean; body: string }
  template?: {
    name: string
    language: { code: string }
    components: TemplateComponent[]
  }
  image?: { link: string; caption: string }
}

// Target
export type MessageScope = 'all' | 'tower' | 'floor' | 'unit'

export interface TargetData {
  scope: MessageScope
  tower?: string
  floor?: string
  unit?: string
}

export interface MessageContent {
  text?: string
  templateName?: string
  components?: TemplateComponent[]
  mediaUrl?: string
  caption?: string
}

// Notification
export interface Notification {
  message: string
  type: 'success' | 'error'
}

// Kanban
export interface KanbanColumn {
  id: ComplaintStatus
  title: string
  color: string
  bg: string
}

// User
export type UserRole = 'admin' | 'syndic' | 'resident'
export type View = 'dashboard' | 'messages' | 'structure' | 'complaints' | 'history'

// Constants
export const COMPLAINT_CATEGORIES = [
  'Barulho',
  'Manutenção',
  'Segurança',
  'Limpeza',
  'Outros',
] as const

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number]
