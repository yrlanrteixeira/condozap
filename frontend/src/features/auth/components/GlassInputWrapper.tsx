interface GlassInputWrapperProps {
  children: React.ReactNode
}

export function GlassInputWrapper({ children }: GlassInputWrapperProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted/20 transition-colors focus-within:border-[#1e3a5f] dark:focus-within:border-primary">
      {children}
    </div>
  )
}
