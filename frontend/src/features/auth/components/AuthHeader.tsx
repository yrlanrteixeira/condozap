import { CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Logo } from '@/shared/components/Logo'

interface AuthHeaderProps {
  title: string
  description: string
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <CardHeader className="space-y-4 text-center pb-6">
      <div className="flex justify-center">
        <div className="p-3 bg-primary rounded-2xl">
          <Logo className="h-12 w-auto" />
        </div>
      </div>
      <div className="space-y-2">
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
    </CardHeader>
  )
}


