import { Card } from '@/components/ui/card'
import { Logo } from '@/components/Logo'

interface AuthCardProps {
  children: React.ReactNode
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        {children}
      </Card>
    </div>
  )
}


