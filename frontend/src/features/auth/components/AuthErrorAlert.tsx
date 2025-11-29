interface AuthErrorAlertProps {
  message: string | null
}

export function AuthErrorAlert({ message }: AuthErrorAlertProps) {
  if (!message) return null

  return (
    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
      {message}
    </div>
  )
}


