import type { Notification } from '@/types'
import { cn } from '@/lib/utils'

interface NotificationToastProps {
  notification: Notification | null
}

export function NotificationToast({ notification }: NotificationToastProps) {
  if (!notification) return null

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 px-6 py-3 rounded shadow-lg text-white font-medium animate-bounce',
        notification.type === 'error' ? 'bg-red-500' : 'bg-green-600'
      )}
    >
      {notification.msg}
    </div>
  )
}
