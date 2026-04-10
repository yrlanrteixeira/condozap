import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { useToast } from "@/shared/components/ui/use-toast";
import type { Resident } from "../types";
import { ResidentForm, type ResidentFormData } from "./ResidentForm";
import { useCreateResident, useUpdateResident } from "../hooks/useResidentsApi";
import { useAppSelector } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/shared/utils/errorMessages";

interface ResidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident?: Resident;
  onClose?: () => void;
}

const initialFormData: ResidentFormData = {
  name: "",
  email: "",
  phone: "",
  tower: "A",
  floor: "",
  unit: "",
  condominiumId: "",
};

type ProvisionInviteResult = {
  mode: "invite_link";
  registerUrl: string;
  whatsappSent: boolean;
  whatsappError?: string;
};

type ProvisionTempResult = {
  mode: "temp_password";
  userId: string;
  email: string;
  provisionalPassword: string;
  whatsappSent: boolean;
  whatsappError?: string;
};

type ProvisionResult = ProvisionInviteResult | ProvisionTempResult;

// Formata telefone para o padrão brasileiro esperado pelo backend (55DXXXXXXXXX ou 55DDXXXXXXXXX)
function formatPhoneForApi(phone: string): string {
  // Remove todos os caracteres não numéricos
  let digits = phone.replace(/\D/g, "");

  if (!digits) return "";

  // Remove TODOS os 55 do início (para evitar duplicação)
  // Ex: 555521999999999 -> 21999999999
  while (digits.startsWith("55")) {
    digits = digits.substring(2);
  }

  // Agora digits deve ter 10 ou 11 dígitos (DDD + número)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Se ficou vazio ou com comprimento inválido, retorna o original limpo
  return digits || phone.replace(/\D/g, "");
}

function isoToDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export const ResidentDialog = ({
  open,
  onOpenChange,
  resident,
  onClose,
}: ResidentDialogProps) => {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const [formData, setFormData] = useState<ResidentFormData>(initialFormData);
  const [originalData, setOriginalData] = useState<ResidentFormData | null>(null);
  const [accountExpiresAt, setAccountExpiresAt] = useState<string | null>(null);
  const [originalExpiresAt, setOriginalExpiresAt] = useState<string | null>(null);
  const [tabsKey, setTabsKey] = useState(0);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteTower, setInviteTower] = useState("");
  const [inviteFloor, setInviteFloor] = useState("");
  const [inviteUnit, setInviteUnit] = useState("");
  const [provisionalPassword, setProvisionalPassword] = useState("");
  const { toast } = useToast();

  const createResident = useCreateResident();
  const updateResident = useUpdateResident();

  const provisionMutation = useMutation({
    mutationFn: async (body: {
      condominiumId: string;
      mode: "invite_link" | "temp_password";
      name: string;
      phone: string;
      email?: string;
      tower?: string;
      floor?: string;
      unit?: string;
      type?: "OWNER" | "TENANT";
      provisionalPassword?: string;
    }) => {
      const { data } = await api.post<ProvisionResult>("/residents/provision", body);
      return data;
    },
  });

  useEffect(() => {
    if (open && resident) {
      setFormData({
        name: resident.name,
        email: resident.email,
        phone: resident.phone,
        tower: resident.tower,
        floor: resident.floor,
        unit: resident.unit,
        condominiumId: resident.condominiumId,
      });
      setOriginalData({
        name: resident.name,
        email: resident.email,
        phone: resident.phone,
        tower: resident.tower,
        floor: resident.floor,
        unit: resident.unit,
        condominiumId: resident.condominiumId,
      });
      const expiresVal = resident.accountExpiresAt
        ? isoToDateInputValue(resident.accountExpiresAt)
        : null;
      setAccountExpiresAt(expiresVal);
      setOriginalExpiresAt(expiresVal);
    } else if (open && !resident) {
      setFormData({
        ...initialFormData,
        condominiumId: currentCondominiumId || "",
      });
      setOriginalData(null);
      setAccountExpiresAt(null);
      setOriginalExpiresAt(null);
      setInviteName("");
      setInvitePhone("");
      setInviteTower("");
      setInviteFloor("");
      setInviteUnit("");
      setProvisionalPassword("");
      setTabsKey((k) => k + 1);
    }
  }, [open, resident, currentCondominiumId]);

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.phone &&
    formData.tower &&
    formData.floor &&
    formData.unit;

  const expirationChanged = accountExpiresAt !== originalExpiresAt;

  const hasChanges = !resident
    ? true
    : !originalData ||
      JSON.stringify(formData) !== JSON.stringify(originalData) ||
      expirationChanged;

  const handleSave = async () => {
    const condoId = formData.condominiumId || currentCondominiumId;
    if (!condoId || !isFormValid) return;

    try {
      let savedUserId: string | null | undefined = resident?.userId;

      if (resident) {
        await updateResident.mutateAsync({
          id: resident.id,
          ...formData,
          phone: formatPhoneForApi(formData.phone),
          condominiumId: condoId,
        });
      } else {
        const created = await createResident.mutateAsync({
          ...formData,
          phone: formatPhoneForApi(formData.phone),
          condominiumId: condoId,
          type: "OWNER",
        });
        savedUserId = (created as { userId?: string })?.userId ?? null;
      }

      if (expirationChanged && savedUserId) {
        const isoValue = accountExpiresAt
          ? new Date(accountExpiresAt).toISOString()
          : null;
        await api.patch(`/users/${savedUserId}/expiration`, {
          accountExpiresAt: isoValue,
          condominiumId: condoId,
        });
      }

      toast({
        title: resident ? "Morador atualizado!" : "Morador cadastrado!",
        description: resident
          ? `${formData.name} foi atualizado com sucesso.`
          : `${formData.name} foi adicionado com sucesso.`,
        variant: "success",
        duration: 3000,
      });

      handleClose();
    } catch {
      toast({
        title: "Erro ao salvar",
        description: resident
          ? "Não foi possível atualizar o morador. Tente novamente."
          : "Não foi possível cadastrar o morador. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  const handleProvisionInvite = async () => {
    const condoId = formData.condominiumId || currentCondominiumId;
    if (!condoId || !inviteName.trim() || !invitePhone.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Informe pelo menos nome e telefone.",
        variant: "error",
      });
      return;
    }

    try {
      const data = await provisionMutation.mutateAsync({
        condominiumId: condoId,
        mode: "invite_link",
        name: inviteName.trim(),
        phone: formatPhoneForApi(invitePhone),
        tower: inviteTower.trim() || undefined,
        floor: inviteFloor.trim() || undefined,
        unit: inviteUnit.trim() || undefined,
      });

      if (data.mode !== "invite_link") return;

      if (data.whatsappSent) {
        toast({
          title: "Convite enviado",
          description: "O link de cadastro foi enviado por WhatsApp.",
          variant: "success",
          duration: 5000,
        });
      } else {
        try {
          await navigator.clipboard.writeText(data.registerUrl);
        } catch {
          /* ignore */
        }
        toast({
          title: "Convite criado",
          description: data.whatsappError
            ? `WhatsApp indisponível (${data.whatsappError}). O link foi copiado para a área de transferência.`
            : "O link foi copiado para a área de transferência.",
          variant: "success",
          duration: 8000,
        });
      }
      handleClose();
    } catch (e: unknown) {
      toast({
        title: "Erro ao criar convite",
        description: getApiErrorMessage(e) || "Tente novamente.",
        variant: "error",
        duration: 6000,
      });
    }
  };

  const handleProvisionTemp = async () => {
    const condoId = formData.condominiumId || currentCondominiumId;
    if (!condoId || !isFormValid) {
      toast({
        title: "Dados incompletos",
        description: "Preencha nome, e-mail, telefone, torre, andar e unidade.",
        variant: "error",
      });
      return;
    }

    try {
      const data = await provisionMutation.mutateAsync({
        condominiumId: condoId,
        mode: "temp_password",
        name: formData.name.trim(),
        phone: formatPhoneForApi(formData.phone),
        email: formData.email.trim().toLowerCase(),
        tower: formData.tower.trim(),
        floor: formData.floor.trim(),
        unit: formData.unit.trim(),
        type: "OWNER",
        provisionalPassword: provisionalPassword.trim() || undefined,
      });

      if (data.mode !== "temp_password") return;

      const extra = data.whatsappError
        ? ` WhatsApp: ${data.whatsappError}`
        : "";
      toast({
        title: "Conta criada",
        description: `E-mail: ${data.email}. Senha provisória: ${data.provisionalPassword}.${extra} O morador deverá trocar a senha no primeiro acesso.`,
        variant: "success",
        duration: 12000,
      });
      handleClose();
    } catch (e: unknown) {
      toast({
        title: "Erro ao criar conta",
        description: getApiErrorMessage(e) || "Tente novamente.",
        variant: "error",
        duration: 6000,
      });
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setAccountExpiresAt(null);
    setOriginalExpiresAt(null);
    onOpenChange(false);
    onClose?.();
  };

  const isLoading = createResident.isPending || updateResident.isPending;
  const isProvisionLoading = provisionMutation.isPending;

  const editContent = (
    <>
      <ResidentForm formData={formData} onChange={setFormData} />

      <div className="space-y-2">
        <Label htmlFor="accountExpiresAt">Validade da conta (opcional)</Label>
        <Input
          id="accountExpiresAt"
          type="date"
          value={accountExpiresAt ?? ""}
          onChange={(e) => setAccountExpiresAt(e.target.value || null)}
        />
        <p className="text-xs text-muted-foreground">
          Deixe vazio para conta sem expiração
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isFormValid || isLoading || !hasChanges}
        >
          {isLoading
            ? "Salvando..."
            : resident
              ? "Salvar Alterações"
              : "Adicionar Morador"}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
            {resident ? "Editar Morador" : "Adicionar Novo Morador"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {resident
              ? "Atualize as informações do morador"
              : "Escolha como cadastrar: registro local, convite por WhatsApp ou conta com senha provisória."}
          </DialogDescription>
        </DialogHeader>

        {resident ? (
          editContent
        ) : (
          <Tabs key={tabsKey} defaultValue="local" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto gap-1 p-1">
              <TabsTrigger value="local" className="text-xs sm:text-sm">
                Cadastro local
              </TabsTrigger>
              <TabsTrigger value="invite" className="text-xs sm:text-sm">
                Convite WhatsApp
              </TabsTrigger>
              <TabsTrigger value="temp" className="text-xs sm:text-sm">
                Senha provisória
              </TabsTrigger>
            </TabsList>

            <TabsContent value="local" className="space-y-4 mt-4">
              <ResidentForm formData={formData} onChange={setFormData} />
              <div className="space-y-2">
                <Label htmlFor="accountExpiresAtLocal">Validade da conta (opcional)</Label>
                <Input
                  id="accountExpiresAtLocal"
                  type="date"
                  value={accountExpiresAt ?? ""}
                  onChange={(e) => setAccountExpiresAt(e.target.value || null)}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!isFormValid || isLoading || !hasChanges}
                >
                  {isLoading ? "Salvando..." : "Adicionar Morador"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="invite" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Envia um link de cadastro por WhatsApp (se configurado). O morador informa e-mail e unidade ao concluir.
              </p>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone (WhatsApp)</Label>
                <Input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Torre (opcional)</Label>
                  <Input
                    value={inviteTower}
                    onChange={(e) => setInviteTower(e.target.value)}
                    placeholder="A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Andar (opcional)</Label>
                  <Input
                    value={inviteFloor}
                    onChange={(e) => setInviteFloor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade (opcional)</Label>
                  <Input
                    value={inviteUnit}
                    onChange={(e) => setInviteUnit(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose} disabled={isProvisionLoading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleProvisionInvite}
                  disabled={
                    isProvisionLoading || !inviteName.trim() || !invitePhone.trim()
                  }
                >
                  {isProvisionLoading ? "Enviando..." : "Criar convite"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="temp" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Cria usuário aprovado com senha provisória. No primeiro login será obrigatório definir nova senha.
              </p>
              <ResidentForm formData={formData} onChange={setFormData} />
              <div className="space-y-2">
                <Label htmlFor="provisionalPw">Senha provisória (opcional)</Label>
                <Input
                  id="provisionalPw"
                  type="password"
                  autoComplete="new-password"
                  value={provisionalPassword}
                  onChange={(e) => setProvisionalPassword(e.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
                <p className="text-xs text-muted-foreground">
                  Se não preencher, o sistema gera uma senha e exibe aqui após criar.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose} disabled={isProvisionLoading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleProvisionTemp}
                  disabled={!isFormValid || isProvisionLoading}
                >
                  {isProvisionLoading ? "Criando..." : "Criar conta"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
