import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { RegisterUserSchema, type RegisterUserInput } from '../schemas';
import { AuthCard, AuthHeader, AuthFooter, AuthErrorAlert, RegisterSuccessCard } from '../components';

export function RegisterPage() {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<RegisterUserInput>({
    resolver: zodResolver(RegisterUserSchema),
    defaultValues: {
      name: '',
      email: '',
      condominiumId: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'admin',
    },
  });

  const handleNextStep = async () => {
    const step1Fields = ['name', 'email', 'condominiumId', 'phone'] as const;
    const isStep1Valid = await form.trigger(step1Fields);

    if (isStep1Valid) {
      setStep(2);
      setError(null);
    }
  };

  const onSubmit = async (values: RegisterUserInput) => {
    setError(null);
    try {
      await signUp(values.email, values.password, values.name, values.role);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  if (success) {
    return <RegisterSuccessCard email={form.getValues('email')} />
  }

  return (
    <AuthCard>
      <AuthHeader
        title="Criar conta"
        description={step === 1 ? "Preencha seus dados pessoais" : "Crie sua senha de acesso"}
      />

        <CardContent className="space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="João Silva"
                            autoComplete="name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="joao@email.com"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condominiumId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condomínio</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome do condomínio"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(11) 99999-9999"
                            autoComplete="tel"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full"
                    size="lg"
                  >
                    Continuar
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <AuthErrorAlert message={error} />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                      size="lg"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar conta'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        </CardContent>

      <AuthFooter>
        <div className="text-sm text-center text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            Fazer login
          </Link>
        </div>
      </AuthFooter>
    </AuthCard>
  );
}

export default RegisterPage;
