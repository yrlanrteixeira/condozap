import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { LoginSchema, type LoginInput } from "../schemas";
import {
  AuthCard,
  AuthHeader,
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
      const result = await signIn(values.email, values.password);
      if (result.user.mustChangePassword) {
        navigate("/auth/first-access", { replace: true });
      } else {
        navigate("/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AuthCard>
      <AuthHeader
        title="Bem-vindo de volta"
        description="Por favor, insira seus dados para acessar o portal do seu condomínio."
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TextInput
          type="email"
          label="E-mail"
          placeholder="voce@exemplo.com"
          autoComplete="email"
          icon={<Mail className="w-4 h-4" />}
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />

        <PasswordInput
          label="Senha"
          placeholder="••••••••"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f] accent-[#1e3a5f]"
            />
            <span className="text-sm text-gray-600 dark:text-muted-foreground">
              Manter conectado
            </span>
          </label>
          <button
            type="button"
            className="text-sm text-[#1e3a5f] dark:text-primary font-medium hover:underline transition-colors"
          >
            Esqueceu a senha?
          </button>
        </div>

        <AuthErrorAlert message={error} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-[#1e3a5f] py-3 font-semibold text-white hover:bg-[#162d4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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

      {/* Divider */}
      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-gray-200 dark:bg-border" />
        <div className="flex-1 h-px bg-gray-200 dark:bg-border" />
      </div>

      {/* Footer */}
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-gray-700 dark:text-foreground">
          Não tem uma conta?
        </p>
        <p className="text-xs text-gray-500 dark:text-muted-foreground leading-relaxed">
          Contate o administrador do seu condomínio ou acesse através do
          seu link de convite específico.
        </p>
      </div>
    </AuthCard>
  );
}

export default LoginPage;
