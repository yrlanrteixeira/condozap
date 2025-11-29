import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthCard } from './AuthCard'

interface RegisterSuccessCardProps {
  email: string
}

export function RegisterSuccessCard({ email }: RegisterSuccessCardProps) {
  return (
    <AuthCard>
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-green-500 rounded-full">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Conta criada com sucesso!</CardTitle>
        <CardDescription>
          Enviamos um email de confirmação para {email}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-primary/10 text-primary text-sm p-4 rounded-md border border-primary/20">
          <p className="font-medium mb-2">Próximos passos:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Verifique sua caixa de entrada</li>
            <li>Clique no link de confirmação</li>
            <li>Faça login para começar</li>
          </ol>
        </div>
      </CardContent>

      <CardFooter>
        <Link to="/auth/login" className="w-full">
          <Button className="w-full" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para login
          </Button>
        </Link>
      </CardFooter>
    </AuthCard>
  )
}


