interface AuthErrorAlertProps {
  message: string | null
}

export function AuthErrorAlert({ message }: AuthErrorAlertProps) {
  if (!message) return null

  return (
    <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-2xl border border-destructive/20 backdrop-blur-sm">
      {message}
    </div>
  )
}


