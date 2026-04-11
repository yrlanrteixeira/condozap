import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Loader2, AlertTriangle, Info, CheckCircle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning' | 'success'
  loadingText?: string
}

const variantConfig = {
  default: {
    icon: Info,
    iconClass: "text-info",
  },
  destructive: {
    icon: AlertTriangle,
    iconClass: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning",
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-success",
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  loadingText = 'Processando...',
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const config = variantConfig[variant]
  const Icon = config.icon

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-md max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full bg-muted`}>
              <Icon className={`h-5 w-5 ${config.iconClass}`} />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? loadingText : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
