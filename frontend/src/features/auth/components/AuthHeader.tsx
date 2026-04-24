import React from 'react'
import { MessageSquare } from 'lucide-react'

interface AuthHeaderProps {
  title: string | React.ReactNode
  description: string
  showLogo?: boolean
}

export function AuthHeader({ title, description, showLogo = true }: AuthHeaderProps) {
  return (
    <div className="space-y-3">
      {/* TalkZap logo mark */}
      {showLogo && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-xl font-bold text-[#1e3a5f] dark:text-foreground tracking-tight">
            TalkZap
          </span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}

