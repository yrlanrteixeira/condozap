import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Info } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useAuth } from "@/shared/contexts/AuthContext";
import { RegisterUserSchema, type RegisterUserInput } from "../schemas";
import {
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthErrorAlert,
  RegisterSuccessCard,
  ConsentDialog,
  TextInput,
  PasswordInput,
} from "../components";

export function RegisterPage() {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  // Dialog states
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [showWhatsappDialog, setShowWhatsappDialog] = useState(false);

  const form = useForm<RegisterUserInput>({
    resolver: zodResolver(RegisterUserSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: "",
      email: "",
      condominiumId: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "RESIDENT",
      consentDataProcessing: false,
      consentWhatsapp: false, // Será obrigatório marcar true
    },
  });

  const handleNextStep = async () => {
    const step1Fields = ["name", "email", "condominiumId", "phone"] as const;
    const isStep1Valid = await form.trigger(step1Fields);

    if (isStep1Valid) {
      setStep(2);
      setError(null);
    }
  };

  const onSubmit = async (values: RegisterUserInput) => {
    setError(null);
    try {
      await signUp({
        email: values.email,
        password: values.password,
        name: values.name,
        role: values.role,
        condominiumId: values.condominiumId,
        phone: values.phone,
        consentDataProcessing: values.consentDataProcessing,
        consentWhatsapp: values.consentWhatsapp,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDataConsentClick = () => {
    if (!form.getValues("consentDataProcessing")) {
      setShowDataDialog(true);
    } else {
      form.setValue("consentDataProcessing", false);
    }
  };

  const handleWhatsappConsentClick = () => {
    // Consentimento WhatsApp é OBRIGATÓRIO - não pode desmarcar
    if (!form.getValues("consentWhatsapp")) {
      setShowWhatsappDialog(true);
    }
    // Não permite desmarcar - comentado propositalmente
    // else {
    //   form.setValue("consentWhatsapp", false);
    // }
  };

  const handleDataConsentAccept = () => {
    form.setValue("consentDataProcessing", true, { shouldValidate: true });
  };

  const handleWhatsappConsentAccept = () => {
    form.setValue("consentWhatsapp", true);
  };

  const isSubmitting = form.formState.isSubmitting;
  const consentDataProcessing = useWatch({ control: form.control, name: "consentDataProcessing" });
  const consentWhatsapp = useWatch({ control: form.control, name: "consentWhatsapp" });

  if (success) {
    return <RegisterSuccessCard email={form.getValues("email")} />;
  }

  return (
    <>
      <AuthCard maxWidth="xl">
        <AuthHeader
          title="Criar conta"
          description={
            step === 1
              ? "Preencha seus dados pessoais"
              : "Crie sua senha e aceite os termos"
          }
        />

        <div className="flex items-center gap-2">
          <div
            className={`flex-1 h-1.5 rounded-full ${
              step >= 1 ? "bg-primary" : "bg-border"
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full ${
              step >= 2 ? "bg-primary" : "bg-border"
            }`}
          />
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TextInput
                  type="text"
                  label="Nome completo"
                  placeholder="João Silva"
                  autoComplete="name"
                  error={form.formState.errors.name?.message}
                  {...form.register("name")}
                />

                <TextInput
                  type="email"
                  label="E-mail"
                  placeholder="joao@email.com"
                  autoComplete="email"
                  error={form.formState.errors.email?.message}
                  {...form.register("email")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TextInput
                  type="text"
                  label="Condomínio"
                  placeholder="Nome do condomínio"
                  error={form.formState.errors.condominiumId?.message}
                  {...form.register("condominiumId")}
                />

                <TextInput
                  type="tel"
                  label="Telefone (WhatsApp)"
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  helperText="Usado para notificações do sistema"
                  error={form.formState.errors.phone?.message}
                  {...form.register("phone")}
                />
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <PasswordInput
                placeholder="••••••••"
                autoComplete="new-password"
                helperText="Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo"
                error={form.formState.errors.password?.message}
                {...form.register("password")}
              />

              <PasswordInput
                label="Confirmar senha"
                placeholder="••••••••"
                autoComplete="new-password"
                error={form.formState.errors.confirmPassword?.message}
                {...form.register("confirmPassword")}
              />

              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Info className="h-4 w-4" />
                  Termos e Consentimentos
                </div>

                <div className="flex items-start space-x-3 rounded-2xl border border-border/50 bg-foreground/5 p-4">
                  <Checkbox
                    checked={consentDataProcessing}
                    onCheckedChange={handleDataConsentClick}
                  />
                  <div className="space-y-1 leading-none flex-1">
                    <label className="text-sm cursor-pointer">
                      Aceito os{" "}
                      <button
                        type="button"
                        onClick={() => setShowDataDialog(true)}
                        className="text-primary underline hover:no-underline"
                      >
                        Termos de Uso e Política de Privacidade
                      </button>{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Autorizo o tratamento dos meus dados conforme a LGPD
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
                  <Checkbox
                    checked={consentWhatsapp}
                    onCheckedChange={handleWhatsappConsentClick}
                  />
                  <div className="space-y-1 leading-none flex-1">
                    <label className="text-sm cursor-pointer">
                      Aceito receber{" "}
                      <button
                        type="button"
                        onClick={() => setShowWhatsappDialog(true)}
                        className="text-green-600 dark:text-green-400 underline hover:no-underline"
                      >
                        notificações via WhatsApp
                      </button>{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Obrigatório. As notificações WhatsApp são essenciais para o funcionamento da plataforma.
                    </p>
                  </div>
                </div>
              </div>

              <AuthErrorAlert message={error} />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-2xl border border-border bg-foreground/5 py-4 font-medium hover:bg-foreground/10 transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !consentDataProcessing || !consentWhatsapp}
                  className="flex-1 rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando conta...
                    </span>
                  ) : (
                    "Criar conta"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        <AuthFooter>
          Já tem uma conta?{" "}
          <Link
            to="/auth/login"
            className="text-primary hover:underline transition-colors font-medium"
          >
            Fazer login
          </Link>
        </AuthFooter>
      </AuthCard>

      {/* Consent Dialogs */}
      <ConsentDialog
        isOpen={showDataDialog}
        onOpenChange={setShowDataDialog}
        type="data"
        onAccept={handleDataConsentAccept}
      />

      <ConsentDialog
        isOpen={showWhatsappDialog}
        onOpenChange={setShowWhatsappDialog}
        type="whatsapp"
        onAccept={handleWhatsappConsentAccept}
      />
    </>
  );
}

export default RegisterPage;
