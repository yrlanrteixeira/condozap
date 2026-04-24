import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Info, User, Mail, RotateCcw } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useAuth } from "@/shared/hooks/useAuth";
import { RegisterUserSchema, type RegisterUserInput } from "../schemas";
import { AuthErrorAlert, ConsentDialog, PasswordInput } from "../components";
import { api } from "@/lib/api";
import type { CondominiumStructure } from "@/features/structure/hooks/useStructureApi";
import { formatTowerHeading, resolveTowerValueForSelect } from "@/features/structure/utils/towerDisplay";

/* ── Types ──────────────────────────────────────────────────────────────── */

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

/* ── Small reusable field component ─────────────────────────────────────── */

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-muted-foreground block">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>
        )}
        {children}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ── Simple error / info screens ─────────────────────────────────────────── */

function SimpleScreen({
  title,
  description,
  linkTo,
  linkLabel,
}: {
  title: string;
  description: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <RegisterLayout heroText="Bem-vindo ao seu novo lar digital.">
      <div className="space-y-4">
        <TalkZapLogo />
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link to={linkTo} className="text-[#1e3a5f] dark:text-primary font-medium hover:underline text-sm">
          {linkLabel}
        </Link>
      </div>
    </RegisterLayout>
  );
}

/* ── Hero left panel ─────────────────────────────────────────────────────── */

function RegisterLayout({
  children,
  heroText = "Bem-vindo ao seu novo lar digital.",
}: {
  children: React.ReactNode;
  heroText?: string;
}) {
  return (
    <div className="h-[100dvh] w-[100dvw] flex flex-col md:flex-row">
      {/* Left: hero photo */}
      <section className="hidden md:flex flex-1 relative overflow-hidden flex-col justify-end p-10">
        <img
          src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1400&q=85&auto=format&fit=crop"
          alt="Condomínio"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="relative z-10 max-w-xs">
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">{heroText}</h2>
          <p className="text-sm text-white/80 leading-relaxed">
            Conecte-se com seu condomínio, gerencie autorizações e participe da comunidade de forma simples e segura.
          </p>
        </div>
      </section>

      {/* Right: form */}
      <section className="flex-1 flex items-center justify-center px-6 py-10 bg-[#f7f8fa] dark:bg-background overflow-y-auto">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}

function TalkZapLogo() {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold">
        ⬛
      </div>
      <span className="text-xl font-bold text-[#1e3a5f] dark:text-foreground tracking-tight">TalkZap</span>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

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

  /* Fetch condo preview */
  const {
    data: condoPreview,
    isLoading: condoLoading,
    isError,
  } = useQuery({
    queryKey: ["publicCondominium", condoSlug],
    queryFn: async (): Promise<PublicCondominiumPreview> => {
      const { data } = await api.get<PublicCondominiumPreview>(`/public/condominiums/${encodeURIComponent(condoSlug)}`);
      return data;
    },
    enabled: condoSlug.length > 0,
    retry: false,
  });

  /* Fetch invite preview */
  const {
    data: invitePreview,
    isLoading: inviteLoading,
    isError: inviteError,
  } = useQuery({
    queryKey: ["registerInvite", inviteParam],
    queryFn: async (): Promise<RegisterInvitePreview> => {
      const { data } = await api.get<RegisterInvitePreview>(
        `/public/register-invites/${encodeURIComponent(inviteParam)}`,
      );
      return data;
    },
    enabled: inviteParam.length > 0,
    retry: false,
  });

  /* Form */
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
      setError("Este convite não corresponde ao link do condomínio.");
      return;
    }
    form.setValue("inviteToken", inviteParam);
    form.setValue("name", invitePreview.name);
    form.setValue("phone", invitePreview.phone);
    if (invitePreview.tower) form.setValue("requestedTower", invitePreview.tower);
    if (invitePreview.floor) form.setValue("requestedFloor", invitePreview.floor);
    if (invitePreview.unit) form.setValue("requestedUnit", invitePreview.unit);
  }, [invitePreview, condoSlug, inviteParam, form]);

  /* Tower options */
  const structure = condoPreview?.structure ?? null;
  const towerNames = (() => {
    const base = structure?.towers?.map((t) => t.name) ?? [];
    const set = new Set(base);
    const t = form.watch("requestedTower");
    if (t && !set.has(t)) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  })();

  const towerSelectValue = resolveTowerValueForSelect(
    form.watch("requestedTower") || "",
    towerNames.length > 0 ? towerNames : ["A", "B", "C"],
  );

  /* Floor options derived from selected tower */
  const selectedTowerData = structure?.towers?.find((t) => t.name === form.watch("requestedTower"));
  const floorOptions = selectedTowerData?.floors?.map((f) => f.number) ?? [];
  const unitOptions =
    selectedTowerData?.floors
      ?.find((f) => String(f.number) === String(form.watch("requestedFloor")))
      ?.units?.map((u) => u.number) ?? [];

  /* Step navigation */
  const handleNextStep = async () => {
    const baseFields = ["name", "email", "phone"] as const;
    if (inviteParam) {
      if (!invitePreview || invitePreview.condominiumSlug !== condoSlug) {
        setError("Convite inválido ou ainda carregando.");
        return;
      }
      const okName = await form.trigger([...baseFields]);
      if (!okName) return;
      const t = form.getValues("requestedTower")?.trim() || invitePreview.tower?.trim() || "";
      const f = form.getValues("requestedFloor")?.trim() || invitePreview.floor?.trim() || "";
      const u = form.getValues("requestedUnit")?.trim() || invitePreview.unit?.trim() || "";
      if (!t || !f || !u) {
        setError("Informe torre, andar e unidade.");
        return;
      }
      setError(null);
      setStep(2);
      return;
    }
    const ok = await form.trigger([...baseFields, "requestedTower", "requestedFloor", "requestedUnit"]);
    if (ok) {
      setStep(2);
      setError(null);
    }
  };

  /* Submit */
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
      setError(typeof err === "string" ? err : err instanceof Error ? err.message : "Erro ao criar conta");
    }
  };

  /* Consent handlers */
  const handleDataConsentClick = () => {
    if (!form.getValues("consentDataProcessing")) setShowDataDialog(true);
    else form.setValue("consentDataProcessing", false);
  };
  const handleWhatsappConsentClick = () => {
    if (!form.getValues("consentWhatsapp")) setShowWhatsappDialog(true);
  };
  const handleDataConsentAccept = () => form.setValue("consentDataProcessing", true, { shouldValidate: true });
  const handleWhatsappConsentAccept = () => form.setValue("consentWhatsapp", true);

  const isSubmitting = form.formState.isSubmitting;
  const consentDataProcessing = useWatch({ control: form.control, name: "consentDataProcessing" });
  const consentWhatsapp = useWatch({ control: form.control, name: "consentWhatsapp" });

  /* ── Guard states ── */
  if (!condoSlug) {
    return (
      <SimpleScreen
        title="Link inválido"
        description="Abra o cadastro pelo link enviado pelo seu condomínio."
        linkTo="/auth/login"
        linkLabel="Ir para o login"
      />
    );
  }
  if (inviteParam && inviteError) {
    return (
      <SimpleScreen
        title="Convite inválido"
        description="Este link de convite não existe, expirou ou já foi utilizado."
        linkTo="/auth/login"
        linkLabel="Ir para o login"
      />
    );
  }
  if (condoLoading || (inviteParam && inviteLoading)) {
    return (
      <RegisterLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f]" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </RegisterLayout>
    );
  }
  if (isError || !condoPreview) {
    return (
      <SimpleScreen
        title="Condomínio não encontrado"
        description="Verifique se o link está completo ou peça um novo link ao síndico."
        linkTo="/auth/login"
        linkLabel="Ir para o login"
      />
    );
  }
  if (!condoPreview.registrationOpen && !inviteParam) {
    return (
      <SimpleScreen
        title="Cadastro indisponível"
        description="Este condomínio não está aceitando novos cadastros no momento."
        linkTo="/auth/login"
        linkLabel="Ir para o login"
      />
    );
  }

  /* ── Render ── */
  return (
    <>
      <RegisterLayout>
        <div className="space-y-6">
          {/* Logo + header */}
          <div>
            <TalkZapLogo />
            <h1 className="text-2xl font-bold text-foreground mt-3">Cadastro de Morador</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1
                ? "Preencha seus dados para acessar o portal do seu condomínio."
                : "Crie sua senha e aceite os termos para finalizar."}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2">
            <div className="flex-1 h-1 rounded-full bg-[#1e3a5f]" />
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-[#1e3a5f]" : "bg-gray-200 dark:bg-muted"}`} />
          </div>

          {/* Invite banner */}
          {inviteParam && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-3 py-2 text-sm text-blue-800 dark:text-blue-300">
              <Info className="h-4 w-4 flex-shrink-0" />
              Convite do síndico — use o mesmo telefone informado no convite.
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Step 1 ── */}
            {step === 1 && (
              <>
                {/* Nome */}
                <Field
                  label="Nome Completo"
                  icon={<User className="w-4 h-4" />}
                  error={form.formState.errors.name?.message}
                >
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    autoComplete="name"
                    className="w-full rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted/20 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-[#1e3a5f] transition-colors"
                    {...form.register("name")}
                  />
                </Field>

                {/* Email */}
                <Field label="E-mail" icon={<Mail className="w-4 h-4" />} error={form.formState.errors.email?.message}>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className="w-full rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted/20 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-[#1e3a5f] transition-colors"
                    {...form.register("email")}
                  />
                </Field>

                {/* Localização no condomínio */}
                <div className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-muted-foreground uppercase tracking-widest">
                    Localização no Condomínio
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Torre */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-muted-foreground">
                        Torre / Bloco
                      </label>
                      <Select
                        value={towerSelectValue}
                        onValueChange={(v) => {
                          form.setValue("requestedTower", v, { shouldValidate: true });
                          form.setValue("requestedFloor", "");
                          form.setValue("requestedUnit", "");
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-muted/20">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(towerNames.length > 0 ? towerNames : ["A", "B", "C"]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {formatTowerHeading(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.requestedTower && (
                        <p className="text-xs text-destructive">{form.formState.errors.requestedTower.message}</p>
                      )}
                    </div>

                    {/* Andar */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-muted-foreground">Andar</label>
                      {floorOptions.length > 0 ? (
                        <Select
                          value={form.watch("requestedFloor")}
                          onValueChange={(v) => {
                            form.setValue("requestedFloor", v, { shouldValidate: true });
                            form.setValue("requestedUnit", "");
                          }}
                        >
                          <SelectTrigger className="bg-white dark:bg-muted/20">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {floorOptions.map((f) => (
                              <SelectItem key={f} value={String(f)}>
                                {f}º andar
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Ex: 5"
                          className="w-full rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-[#1e3a5f] transition-colors"
                          {...form.register("requestedFloor")}
                        />
                      )}
                      {form.formState.errors.requestedFloor && (
                        <p className="text-xs text-destructive">{form.formState.errors.requestedFloor.message}</p>
                      )}
                    </div>

                    {/* Unidade */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-muted-foreground">Unidade</label>
                      {unitOptions.length > 0 ? (
                        <Select
                          value={form.watch("requestedUnit")}
                          onValueChange={(v) => form.setValue("requestedUnit", v, { shouldValidate: true })}
                        >
                          <SelectTrigger className="bg-white dark:bg-muted/20">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {unitOptions.map((u) => (
                              <SelectItem key={u} value={String(u)}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Ex: 501"
                          className="w-full rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-[#1e3a5f] transition-colors"
                          {...form.register("requestedUnit")}
                        />
                      )}
                      {form.formState.errors.requestedUnit && (
                        <p className="text-xs text-destructive">{form.formState.errors.requestedUnit.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Senha + Confirmar no Step 1 */}
                <PasswordInput
                  label="Senha"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  helperText="Mínimo 8 caracteres"
                  error={form.formState.errors.password?.message}
                  {...form.register("password")}
                />

                <PasswordInput
                  label="Confirmar Senha"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  icon={<RotateCcw className="w-4 h-4" />}
                  error={form.formState.errors.confirmPassword?.message}
                  {...form.register("confirmPassword")}
                />

                <AuthErrorAlert message={error} />

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full rounded-lg bg-[#1e3a5f] py-3 font-semibold text-white hover:bg-[#162d4a] transition-colors flex items-center justify-center gap-2"
                >
                  Criar Conta →
                </button>
              </>
            )}

            {/* ── Step 2: Consents ── */}
            {step === 2 && (
              <>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Info className="h-4 w-4" />
                    Termos e Consentimentos
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border border-border/50 bg-white dark:bg-muted/10 p-4">
                    <Checkbox checked={consentDataProcessing} onCheckedChange={handleDataConsentClick} />
                    <div className="space-y-1 leading-none flex-1">
                      <label className="text-sm cursor-pointer">
                        Aceito os{" "}
                        <button
                          type="button"
                          onClick={() => setShowDataDialog(true)}
                          className="text-[#1e3a5f] underline hover:no-underline"
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

                  <div className="flex items-start space-x-3 rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-4">
                    <Checkbox checked={consentWhatsapp} onCheckedChange={handleWhatsappConsentClick} />
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
                        Obrigatório para o funcionamento da plataforma.
                      </p>
                    </div>
                  </div>
                </div>

                <AuthErrorAlert message={error} />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted/10 py-3 font-medium hover:bg-gray-50 transition-colors text-sm"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !consentDataProcessing || !consentWhatsapp}
                    className="flex-1 rounded-lg bg-[#1e3a5f] py-3 font-semibold text-white hover:bg-[#162d4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando...
                      </span>
                    ) : (
                      "Confirmar Cadastro"
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 dark:text-muted-foreground">
            Já possui uma conta?{" "}
            <Link to="/auth/login" className="text-[#1e3a5f] dark:text-primary font-semibold hover:underline">
              Entrar no portal
            </Link>
          </p>
        </div>
      </RegisterLayout>

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
