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

  const form = useForm<RegisterUserInput>({
    resolver: zodResolver(RegisterUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'admin',
    },
  });

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
        description="Comece a gerenciar seu condomínio de forma inteligente"
      />

        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        placeholder="joao@condominio.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use um email profissional do condomínio
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <Button
                type="submit"
                className="w-full"
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
