export interface Resident {
  id: string
  name: string
  phone: string
  tower: string
  floor: string
  unit: string
}

export interface Message {
  id: number
  timestamp: string
  type: 'template' | 'text' | 'image'
  templateName?: string | null
  scope: string
  target: string
  phone?: string
  content: string
  payload?: WhatsAppPayload
  status: 'sent' | 'delivered' | 'read' | 'failed'
}

export interface Complaint {
  id: number
  residentId: string
  category: string
  content: string
  status: 'open' | 'in_progress' | 'resolved'
  timestamp: string
}

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

export interface TargetData {
  scope: 'all' | 'tower' | 'floor' | 'unit'
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

export interface Notification {
  msg: string
  type: 'success' | 'error'
}

export type UserRole = 'admin' | 'syndic' | 'resident'
export type View = 'dashboard' | 'messages' | 'structure' | 'complaints' | 'history'

export interface KanbanColumn {
  id: Complaint['status']
  title: string
  icon: React.ComponentType<{ size?: number }>
  color: string
  bg: string
}
