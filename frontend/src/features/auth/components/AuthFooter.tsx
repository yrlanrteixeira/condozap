import { Building2 } from 'lucide-react'
import { CardFooter } from '@/components/ui/card'

interface AuthFooterProps {
  children?: React.ReactNode
}

export function AuthFooter({ children }: AuthFooterProps) {
  return (
    <CardFooter className="flex flex-col space-y-4 border-t pt-6">
      {children}
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Building2 className="h-3 w-3" />
        <span>Sistema de gestão condominial via WhatsApp</span>
      </div>
    </CardFooter>
  )
}


