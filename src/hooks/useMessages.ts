import { useState, useCallback } from 'react'
import type { Message, Resident, TargetData, MessageContent, WhatsAppPayload, TemplateComponent } from '@/types'
import { INITIAL_MESSAGES } from '@/data/mock'

interface UseMessagesProps {
  residents: Resident[]
  onSuccess?: (count: number) => void
  onError?: (message: string) => void
}

export function useMessages({ residents, onSuccess, onError }: UseMessagesProps) {
  const [messageLog, setMessageLog] = useState<Message[]>(INITIAL_MESSAGES)

  const sendMessage = useCallback(
    (targetData: TargetData, messageType: Message['type'], content: MessageContent) => {
      let recipients: Resident[] = []

      if (targetData.scope === 'all') {
        recipients = residents
      } else if (targetData.scope === 'tower') {
        recipients = residents.filter((r) => r.tower === targetData.tower)
      } else if (targetData.scope === 'floor') {
        recipients = residents.filter(
          (r) => r.tower === targetData.tower && r.floor === targetData.floor
        )
      } else if (targetData.scope === 'unit') {
        recipients = residents.filter(
          (r) => r.unit === targetData.unit && r.tower === targetData.tower
        )
      }

      if (recipients.length === 0) {
        onError?.('Nenhum morador encontrado para este filtro.')
        return
      }

      const newLogs: Message[] = recipients.map((r) => {
        const apiPayload: WhatsAppPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: r.phone,
          type: messageType === 'template' ? 'template' : 'text',
          ...(messageType === 'text' && {
            text: { preview_url: false, body: content.text || '' },
          }),
          ...(messageType === 'template' && {
            template: {
              name: content.templateName || '',
              language: { code: 'pt_BR' },
              components: content.components as TemplateComponent[],
            },
          }),
          ...(messageType === 'image' && {
            image: { link: content.mediaUrl || '', caption: content.caption || '' },
          }),
        }

        console.log('WhatsApp API Payload Generated:', apiPayload)

        return {
          id: Date.now() + Math.random(),
          timestamp: new Date().toISOString(),
          type: messageType,
          templateName: messageType === 'template' ? content.templateName : null,
          scope: targetData.scope,
          target: r.name,
          phone: r.phone,
          content:
            messageType === 'text'
              ? content.text || ''
              : `Template: ${content.templateName}`,
          payload: apiPayload,
          status: 'sent' as const,
        }
      })

      setMessageLog((prev) => [...newLogs, ...prev])
      onSuccess?.(newLogs.length)
    },
    [residents, onSuccess, onError]
  )

  return {
    messageLog,
    sendMessage,
  }
}
