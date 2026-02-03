import React from 'react'

interface AuthHeaderProps {
  title: string | React.ReactNode
  description: string
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground">
        {typeof title === 'string' ? <span className="font-light">{title}</span> : title}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}


