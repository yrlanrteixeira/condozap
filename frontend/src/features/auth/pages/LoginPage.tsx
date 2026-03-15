import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { LoginSchema, type LoginInput } from "../schemas";
import {
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthErrorAlert,
  TextInput,
  PasswordInput
} from "../components";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setError(null);
    try {
      await signIn(values.email, values.password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AuthCard>
      {/* Logo CondoZap - visível apenas em mobile */}
      <div className="flex items-center gap-2 md:hidden mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <span className="text-xl font-bold text-foreground">CondoZap</span>
      </div>
      
      <AuthHeader
        title="Bem-vindo ao TalkZap"
        description="Acesse sua conta para gerenciar seu condomínio"
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <TextInput
          type="email"
          label="E-mail"
          placeholder="exemplo@email.com"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />

        <PasswordInput
          placeholder="Digite sua senha"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground/90">Manter conectado</span>
          </label>
          <Link
            to="/auth/reset-password"
            className="hover:underline text-primary transition-colors"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <AuthErrorAlert message={error} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Entrando...
            </span>
          ) : (
            "Entrar"
          )}
        </button>
      </form>

      <AuthFooter>
        Não tem uma conta?{" "}
        <Link
          to="/auth/register"
          className="text-primary hover:underline transition-colors font-medium"
        >
          Criar conta
        </Link>
      </AuthFooter>
    </AuthCard>
  );
}

export default LoginPage;
