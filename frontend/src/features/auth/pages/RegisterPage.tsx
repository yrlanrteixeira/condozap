import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { RegisterUserSchema, type RegisterUserInput } from "../schemas";
import {
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthErrorAlert,
  RegisterSuccessCard,
  ConsentDialog,
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
  const consentDataProcessing = form.watch("consentDataProcessing");
  const consentWhatsapp = form.watch("consentWhatsapp");

  if (success) {
    return <RegisterSuccessCard email={form.getValues("email")} />;
  }

  return (
    <>
      <AuthCard>
        <AuthHeader
          title="Criar conta"
          description={
            step === 1
              ? "Preencha seus dados pessoais"
              : "Crie sua senha e aceite os termos"
          }
        />

        <CardContent className="space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div
              className={`flex-1 h-1 rounded ${
                step >= 1 ? "bg-primary" : "bg-gray-200"
              }`}
            />
            <div
              className={`flex-1 h-1 rounded ${
                step >= 2 ? "bg-primary" : "bg-gray-200"
              }`}
            />
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
                          <Input placeholder="Nome do condomínio" {...field} />
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
                        <FormLabel>Telefone (WhatsApp)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(11) 99999-9999"
                            autoComplete="tel"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Usado para notificações do sistema
                        </FormDescription>
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
                          Mínimo 8 caracteres, com maiúscula, minúscula, número e
                          símbolo
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

                  {/* Consent Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Info className="h-4 w-4" />
                      Termos e Consentimentos
                    </div>

                    {/* Data Processing Consent - Required */}
                    <FormField
                      control={form.control}
                      name="consentDataProcessing"
                      render={() => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={consentDataProcessing}
                              onCheckedChange={handleDataConsentClick}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Aceito os{" "}
                              <button
                                type="button"
                                onClick={() => setShowDataDialog(true)}
                                className="text-primary underline hover:no-underline"
                              >
                                Termos de Uso e Política de Privacidade
                              </button>{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormDescription>
                              Autorizo o tratamento dos meus dados conforme a LGPD
                            </FormDescription>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* WhatsApp Consent - OBRIGATÓRIO */}
                    <FormField
                      control={form.control}
                      name="consentWhatsapp"
                      render={() => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50">
                          <FormControl>
                            <Checkbox
                              checked={consentWhatsapp}
                              onCheckedChange={handleWhatsappConsentClick}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Aceito receber{" "}
                              <button
                                type="button"
                                onClick={() => setShowWhatsappDialog(true)}
                                className="text-green-600 underline hover:no-underline"
                              >
                                notificações via WhatsApp
                              </button>{" "}
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormDescription className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              Obrigatório. As notificações WhatsApp são essenciais para o funcionamento da plataforma.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <AuthErrorAlert message={error} />

                  <div className="flex gap-2 pt-2">
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
                      disabled={isSubmitting || !consentDataProcessing || !consentWhatsapp}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar conta"
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
            Já tem uma conta?{" "}
            <Link
              to="/auth/login"
              className="text-primary hover:underline font-medium"
            >
              Fazer login
            </Link>
          </div>
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
