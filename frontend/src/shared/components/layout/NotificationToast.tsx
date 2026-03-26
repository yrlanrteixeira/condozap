import { cn } from '@/lib/utils'
import { useApp } from '@/shared/contexts'
import { CheckCircle2, XCircle } from 'lucide-react'

export function NotificationToast() {
  const { notification } = useApp()

  if (!notification) return null

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg font-medium animate-slide-in flex items-center gap-2 max-w-md',
        notification.type === 'error'
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-success text-success-foreground'
      )}
      role="alert"
      aria-live="polite"
    >
      {notification.type === 'error' ? (
        <XCircle size={20} className="flex-shrink-0" />
      ) : (
        <CheckCircle2 size={20} className="flex-shrink-0" />
      )}
      <span className="flex-1">{notification.message}</span>
    </div>
  )
}
