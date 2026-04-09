import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Info, Building2 } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { useAuth } from "@/shared/hooks/useAuth";
import { RegisterUserSchema, type RegisterUserInput } from "../schemas";
import {
  AuthCard,
  AuthHeader,
  AuthFooter,
  AuthErrorAlert,
  ConsentDialog,
  TextInput,
  PasswordInput,
} from "../components";
import { api } from "@/lib/api";
import type { CondominiumStructure } from "@/features/structure/hooks/useStructureApi";
import {
  formatTowerHeading,
  resolveTowerValueForSelect,
} from "@/features/structure/utils/towerDisplay";

type PublicCondominiumPreview = {
  id: string;
  slug: string;
  name: string;
  status: string;
  registrationOpen: boolean;
  structure: CondominiumStructure | null;
};

type RegisterInvitePreview = {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  name: string;
  phone: string;
  tower: string | null;
  floor: string | null;
  unit: string | null;
  registrationOpen: boolean;
};

type RegisterResponse = {
  user: { status?: string; mustChangePassword?: boolean };
  token: string;
  refreshToken?: string;
};

export function RegisterPage() {
  const { condoSlug = "" } = useParams<{ condoSlug: string }>();
  const [searchParams] = useSearchParams();
  const inviteParam = searchParams.get("invite")?.trim() ?? "";
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [showDataDialog, setShowDataDialog] = useState(false);
  const [showWhatsappDialog, setShowWhatsappDialog] = useState(false);

  const { data: condoPreview, isLoading: condoLoading, isError } = useQuery({
    queryKey: ["publicCondominium", condoSlug],
    queryFn: async (): Promise<PublicCondominiumPreview> => {
      const { data } = await api.get<PublicCondominiumPreview>(
        `/public/condominiums/${encodeURIComponent(condoSlug)}`
      );
      return data;
    },
    enabled: condoSlug.length > 0,
    retry: false,
  });

  const {
    data: invitePreview,
    isLoading: inviteLoading,
    isError: inviteError,
  } = useQuery({
    queryKey: ["registerInvite", inviteParam],
    queryFn: async (): Promise<RegisterInvitePreview> => {
      const { data } = await api.get<RegisterInvitePreview>(
        `/public/register-invites/${encodeURIComponent(inviteParam)}`
      );
      return data;
    },
    enabled: inviteParam.length > 0,
    retry: false,
  });

  const form = useForm<RegisterUserInput>({
    resolver: zodResolver(RegisterUserSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "RESIDENT",
      requestedTower: "A",
      requestedFloor: "",
      requestedUnit: "",
      inviteToken: "",
      consentDataProcessing: false,
      consentWhatsapp: false,
    },
  });

  useEffect(() => {
    if (!invitePreview) return;
    if (invitePreview.condominiumSlug !== condoSlug) {
      setError(
        "Este convite não corresponde ao link do condomínio. Use o link completo enviado pelo WhatsApp."
      );
      return;
    }
    form.setValue("inviteToken", inviteParam);
    form.setValue("name", invitePreview.name);
    form.setValue("phone", invitePreview.phone);
    if (invitePreview.tower) form.setValue("requestedTower", invitePreview.tower);
    if (invitePreview.floor) form.setValue("requestedFloor", invitePreview.floor);
    if (invitePreview.unit) form.setValue("requestedUnit", invitePreview.unit);
  }, [invitePreview, condoSlug, inviteParam, form]);

  const structure = condoPreview?.structure ?? null;
  const towerNames = (() => {
    const base = structure?.towers?.map((t) => t.name) ?? [];
    const set = new Set(base);
    const t = form.watch("requestedTower");
    if (t && !set.has(t)) set.add(t);
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true })
    );
  })();

  const towerSelectValue = resolveTowerValueForSelect(
    form.watch("requestedTower") || "",
    towerNames.length > 0 ? towerNames : ["A", "B", "C"]
  );

  const handleNextStep = async () => {
    const baseFields = ["name", "email", "phone"] as const;

    if (inviteParam) {
      if (!invitePreview || invitePreview.condominiumSlug !== condoSlug) {
        setError("Convite inválido ou ainda carregando.");
        return;
      }
      const okName = await form.trigger([...baseFields]);
      if (!okName) return;
      const t =
        form.getValues("requestedTower")?.trim() ||
        invitePreview.tower?.trim() ||
        "";
      const f =
        form.getValues("requestedFloor")?.trim() ||
        invitePreview.floor?.trim() ||
        "";
      const u =
        form.getValues("requestedUnit")?.trim() ||
        invitePreview.unit?.trim() ||
        "";
      if (!t || !f || !u) {
        setError("Informe torre, andar e unidade (ou peça ao síndico para pré-preencher o convite).");
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    const ok = await form.trigger([
      ...baseFields,
      "requestedTower",
      "requestedFloor",
      "requestedUnit",
    ]);
    if (ok) {
      setStep(2);
      setError(null);
    }
  };

  const onSubmit = async (values: RegisterUserInput) => {
    setError(null);
    try {
      const result = (await signUp({
        email: values.email,
        password: values.password,
        name: values.name,
        role: values.role,
        requestedCondominiumSlug: condoSlug,
        phone: values.phone,
        requestedTower: values.requestedTower,
        requestedFloor: values.requestedFloor,
        requestedUnit: values.requestedUnit,
        inviteToken: values.inviteToken || inviteParam || undefined,
        consentDataProcessing: values.consentDataProcessing,
        consentWhatsapp: values.consentWhatsapp,
      })) as RegisterResponse;

      if (result.user?.mustChangePassword) {
        navigate("/auth/first-access", { replace: true });
      } else if (result.user?.status === "PENDING") {
        navigate("/pending-approval", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Erro ao criar conta"
      );
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
    if (!form.getValues("consentWhatsapp")) {
      setShowWhatsappDialog(true);
    }
  };

  const handleDataConsentAccept = () => {
    form.setValue("consentDataProcessing", true, { shouldValidate: true });
  };

  const handleWhatsappConsentAccept = () => {
    form.setValue("consentWhatsapp", true);
  };

  const isSubmitting = form.formState.isSubmitting;
  const consentDataProcessing = useWatch({
    control: form.control,
    name: "consentDataProcessing",
  });
  const consentWhatsapp = useWatch({
    control: form.control,
    name: "consentWhatsapp",
  });

  if (!condoSlug) {
    return (
      <AuthCard maxWidth="md">
        <AuthHeader
          title="Link inválido"
          description="Abra o cadastro pelo link enviado pelo seu condomínio."
        />
        <AuthFooter>
          <Link
            to="/auth/register"
            className="text-primary hover:underline font-medium"
          >
            Saiba como obter o link
          </Link>
        </AuthFooter>
      </AuthCard>
    );
  }

  if (inviteParam && inviteError) {
    return (
      <AuthCard maxWidth="md">
        <AuthHeader
          title="Convite inválido"
          description="Este link de convite não existe, expirou ou já foi utilizado. Peça um novo convite ao síndico."
        />
        <AuthFooter>
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            Ir para o login
          </Link>
        </AuthFooter>
      </AuthCard>
    );
  }

  if (condoLoading || (inviteParam && inviteLoading)) {
    return (
      <AuthCard maxWidth="xl">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </AuthCard>
    );
  }

  if (isError || !condoPreview) {
    return (
      <AuthCard maxWidth="md">
        <AuthHeader
          title="Condomínio não encontrado"
          description="Verifique se o link está completo ou peça um novo link ao síndico."
        />
        <AuthFooter>
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            Ir para o login
          </Link>
        </AuthFooter>
      </AuthCard>
    );
  }

  if (inviteParam && invitePreview && !invitePreview.registrationOpen) {
    return (
      <AuthCard maxWidth="md">
        <AuthHeader
          title="Cadastro indisponível"
          description="Este condomínio não está aceitando novos cadastros no momento."
        />
        <AuthFooter>
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            Ir para o login
          </Link>
        </AuthFooter>
      </AuthCard>
    );
  }

  if (!condoPreview.registrationOpen && !inviteParam) {
    return (
      <AuthCard maxWidth="md">
        <AuthHeader
          title="Cadastro indisponível"
          description="Este condomínio não está aceitando novos cadastros no momento. Entre em contato com a administração."
        />
        <AuthFooter>
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            Ir para o login
          </Link>
        </AuthFooter>
      </AuthCard>
    );
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

        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
          <Building2 className="h-8 w-8 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Condomínio
            </p>
            <p className="truncate font-semibold text-foreground">
              {condoPreview.name}
            </p>
          </div>
        </div>

        {inviteParam ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
            Você está concluindo um <strong>convite do síndico</strong>. Use o mesmo
            telefone informado no convite.
          </p>
        ) : null}

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
                  type="tel"
                  label="Telefone (WhatsApp)"
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  helperText="Usado para notificações do sistema"
                  error={form.formState.errors.phone?.message}
                  {...form.register("phone")}
                />
              </div>

              <AuthErrorAlert message={error} />

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Localização da unidade
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Torre
                    </label>
                    <Select
                      value={towerSelectValue}
                      onValueChange={(v) =>
                        form.setValue("requestedTower", v, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Torre" />
                      </SelectTrigger>
                      <SelectContent>
                        {(towerNames.length > 0 ? towerNames : ["A", "B", "C"]).map(
                          (tower) => (
                            <SelectItem key={tower} value={tower}>
                              {formatTowerHeading(tower)}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.requestedTower?.message ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.requestedTower.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Andar
                    </label>
                    <Input
                      placeholder="Ex: 5"
                      {...form.register("requestedFloor")}
                    />
                    {form.formState.errors.requestedFloor?.message ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.requestedFloor.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Unidade
                    </label>
                    <Input
                      placeholder="Ex: 501"
                      {...form.register("requestedUnit")}
                    />
                    {form.formState.errors.requestedUnit?.message ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.requestedUnit.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {inviteParam
                    ? "Se o síndico já informou a unidade no convite, os campos vêm preenchidos."
                    : "Obrigatório para solicitar acesso ao condomínio."}
                </p>
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
