import { useState, useCallback } from 'react'
import type { Notification } from '@/types'

export function useNotification() {
  const [notification, setNotification] = useState<Notification | null>(null)

  const showNotification = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const clearNotification = useCallback(() => {
    setNotification(null)
  }, [])

  return {
    notification,
    showNotification,
    clearNotification,
  }
}
