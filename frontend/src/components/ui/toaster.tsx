/**
 * Toaster Component - Container de toasts
 * 
 * Adicione este componente no App.tsx para exibir toasts
 */

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  variantIcons,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant = "default", ...props }) {
        const Icon = variantIcons[variant]
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle>
                  <Icon className="h-4 w-4" />
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}


