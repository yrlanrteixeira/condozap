// ============================================
// TYPES SIMPLES - SEM CLASSES, SEM VALIDATORS
// ============================================

// Resident
export type ResidentType = 'OWNER' | 'TENANT'

export interface Resident {
  id: string
  condominiumId: string
  userId?: string | null
  name: string
  phone: string
  tower: string
  floor: string
  unit: string
  type: ResidentType
  consentWhatsapp: boolean
  consentDataProcessing: boolean
  createdAt: string
}

// Complaint
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved'
export type ComplaintPriority = 'critical' | 'high' | 'medium' | 'low'

export interface Complaint {
  id: number
  condominiumId: string
  residentId: string
  category: string
  content: string
  status: ComplaintStatus
  priority?: ComplaintPriority
  timestamp: string
}

// Message
export type MessageType = 'text' | 'template' | 'image'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  id: number
  condominiumId?: string
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

// Condominium
export interface Condominium {
  id: string
  name: string
  cnpj: string
  address: string
  towers: string[]
}

// User with permissions
export type UserRole = 'professional_syndic' | 'admin' | 'syndic' | 'resident'
export type PermissionScope = 'global' | 'local'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  permissionScope: PermissionScope
  condominiumIds: string[] // Array of condos the user has access to
  residentId?: string // Link to Resident for role 'resident'
}

export type View = 'unified_dashboard' | 'dashboard' | 'messages' | 'structure' | 'complaints' | 'history'

// Urgent Feed Item
export interface UrgentFeedItem {
  id: number
  condominiumId: string
  condominiumName: string
  type: 'complaint' | 'message'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  timestamp: string
  isRead: boolean
}

// Constants
export const COMPLAINT_CATEGORIES = [
  'Barulho',
  'Manutenção',
  'Segurança',
  'Limpeza',
  'Outros',
] as const

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number]
