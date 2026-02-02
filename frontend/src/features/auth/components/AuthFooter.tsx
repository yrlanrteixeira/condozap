interface AuthFooterProps {
  children?: React.ReactNode
}

export function AuthFooter({ children }: AuthFooterProps) {
  return (
    <div className="text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}


