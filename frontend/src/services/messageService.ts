import type {
  Message,
  Resident,
  MessageType,
  TargetData,
  MessageContent,
  WhatsAppPayload,
} from '@/types'
import { dataStore } from '@/data/mockData'
import { filterResidentsByTarget } from '@/utils/helpers'
import { generateUniqueId } from '@/utils/constants'

// Get all messages
export function getAllMessages(): Message[] {
  return [...dataStore.messages]
}

// Send text message to single resident
export function sendTextMessage(recipient: Resident, text: string): Message {
  const payload: WhatsAppPayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient.phone,
    type: 'text',
    text: { preview_url: false, body: text },
  }

  console.log('WhatsApp API Payload:', payload)

  const message: Message = {
    id: generateUniqueId(),
    timestamp: new Date().toISOString(),
    type: 'text',
    scope: 'unit',
    target: recipient.name,
    phone: recipient.phone,
    content: text,
    payload,
    status: 'sent',
  }

  dataStore.messages.unshift(message)
  return message
}

// Send bulk messages
export function sendBulkMessage(
  targetData: TargetData,
  messageType: MessageType,
  content: MessageContent
): number {
  const recipients = filterResidentsByTarget(dataStore.residents, targetData)

  if (recipients.length === 0) {
    throw new Error('Nenhum morador encontrado para este filtro.')
  }

  const scopeLabel = getScopeLabel(targetData)

  recipients.forEach((recipient) => {
    const payload = buildPayload(recipient, messageType, content)
    console.log('WhatsApp API Payload:', payload)

    const message: Message = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      type: messageType,
      templateName: content.templateName || null,
      scope: scopeLabel,
      target: recipient.name,
      phone: recipient.phone,
      content: getMessageContent(messageType, content),
      payload,
      status: 'sent',
    }

    dataStore.messages.unshift(message)
  })

  return recipients.length
}

// Build WhatsApp payload
function buildPayload(
  recipient: Resident,
  messageType: MessageType,
  content: MessageContent
): WhatsAppPayload {
  const base: WhatsAppPayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient.phone,
    type: messageType,
  }

  switch (messageType) {
    case 'text':
      return {
        ...base,
        text: { preview_url: false, body: content.text || '' },
      }
    case 'template':
      return {
        ...base,
        template: {
          name: content.templateName || '',
          language: { code: 'pt_BR' },
          components: content.components || [],
        },
      }
    case 'image':
      return {
        ...base,
        image: {
          link: content.mediaUrl || '',
          caption: content.caption || '',
        },
      }
    default:
      return base
  }
}

// Get message content text
function getMessageContent(
  messageType: MessageType,
  content: MessageContent
): string {
  if (messageType === 'text') {
    return content.text || ''
  }
  if (messageType === 'template') {
    return `Template: ${content.templateName}`
  }
  if (messageType === 'image') {
    return `Image: ${content.mediaUrl}`
  }
  return ''
}

// Get scope label
function getScopeLabel(targetData: TargetData): string {
  switch (targetData.scope) {
    case 'all':
      return 'Todos'
    case 'tower':
      return `Torre ${targetData.tower}`
    case 'floor':
      return `Torre ${targetData.tower}, ${targetData.floor}º andar`
    case 'unit':
      return `Unidade ${targetData.unit}, Torre ${targetData.tower}`
    default:
      return 'Desconhecido'
  }
}
