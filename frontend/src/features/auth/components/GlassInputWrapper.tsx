interface GlassInputWrapperProps {
  children: React.ReactNode
}

export function GlassInputWrapper({ children }: GlassInputWrapperProps) {
  return (
    <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/10">
      {children}
    </div>
  )
}
