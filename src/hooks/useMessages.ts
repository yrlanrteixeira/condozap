import { useState, useCallback, useEffect } from 'react'
import type { Message, TargetData, MessageContent } from '@/types'
import { getAllMessages, sendBulkMessage } from '@/services/messageService'

interface UseMessagesProps {
  onSuccess?: (count: number) => void
  onError?: (message: string) => void
}

export function useMessages({ onSuccess, onError }: UseMessagesProps = {}) {
  const [messageLog, setMessageLog] = useState<Message[]>([])

  useEffect(() => {
    setMessageLog(getAllMessages())
  }, [])

  const sendMessage = useCallback(
    (targetData: TargetData, messageType: Message['type'], content: MessageContent) => {
      try {
        const count = sendBulkMessage(targetData, messageType, content)
        setMessageLog(getAllMessages())
        onSuccess?.(count)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem'
        onError?.(errorMessage)
      }
    },
    [onSuccess, onError]
  )

  return {
    messageLog,
    sendMessage,
  }
}
