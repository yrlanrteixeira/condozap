import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import {
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthErrorAlert,
  PasswordInput,
} from "../components";

const FirstPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número")
      .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "As senhas não coincidem",
    path: ["confirmNewPassword"],
  });

type FirstPasswordInput = z.infer<typeof FirstPasswordSchema>;

export function FirstAccessPage() {
  const { user, completeFirstPassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FirstPasswordInput>({
    resolver: zodResolver(FirstPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!user.mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: FirstPasswordInput) => {
    setError(null);
    try {
      await completeFirstPassword({
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Não foi possível definir a nova senha"
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AuthCard maxWidth="md">
      <AuthHeader
        title="Definir nova senha"
        description="Por segurança, defina uma nova senha para continuar usando o TalkZap."
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <PasswordInput
          label="Nova senha"
          placeholder="••••••••"
          autoComplete="new-password"
          helperText="Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo"
          error={form.formState.errors.newPassword?.message}
          {...form.register("newPassword")}
        />

        <PasswordInput
          label="Confirmar nova senha"
          placeholder="••••••••"
          autoComplete="new-password"
          error={form.formState.errors.confirmNewPassword?.message}
          {...form.register("confirmNewPassword")}
        />

        <AuthErrorAlert message={error} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </span>
          ) : (
            "Continuar"
          )}
        </button>
      </form>

      <AuthFooter>
        <button
          type="button"
          className="text-muted-foreground text-sm hover:text-foreground"
          onClick={async () => {
            await signOut();
            navigate("/auth/login", { replace: true });
          }}
        >
          Sair e voltar ao login
        </button>
      </AuthFooter>
    </AuthCard>
  );
}

export default FirstAccessPage;
