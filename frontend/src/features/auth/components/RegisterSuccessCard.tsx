import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { AuthCard } from './AuthCard'

interface RegisterSuccessCardProps {
  email: string
}

export function RegisterSuccessCard({ email }: RegisterSuccessCardProps) {
  return (
    <AuthCard>
      {/* Success Icon & Header */}
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-green-500 rounded-2xl">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground">
          <span className="font-light">Conta criada!</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Enviamos um email de confirmação para {email}
        </p>
      </div>

      {/* Steps */}
      <div className="bg-primary/10 text-primary text-sm p-5 rounded-2xl border border-primary/20 backdrop-blur-sm">
        <p className="font-medium mb-3">Próximos passos:</p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Verifique sua caixa de entrada</li>
          <li>Clique no link de confirmação</li>
          <li>Faça login para começar</li>
        </ol>
      </div>

      {/* Back to Login Button */}
      <Link to="/auth/login" className="w-full">
        <button className="w-full rounded-2xl border border-border bg-foreground/5 py-4 font-medium hover:bg-foreground/10 transition-colors flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </button>
      </Link>
    </AuthCard>
  )
}


