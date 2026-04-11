import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  FolderKanban,
  X,
  Tag,
  Shield,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Separator } from "@/shared/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from "@/shared/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/shared/utils/errorMessages";
import { permissionLabel, PERMISSION_CATEGORIES } from "@/config/permissionLabels";
import {
  useSectors,
  useCreateSector,
  useUpdateSector,
  useDeleteSector,
  useAvailableMembers,
  useAddExistingMember,
} from "../hooks/useSectorsApi";
import type { SectorMember } from "../types";

// ─── Catálogo de permissões (API) ─────────────────────────────────────────────

function useSectorCatalogPermissionKeys() {
  return useQuery({
    queryKey: ["permissions-catalog", "sector"],
    queryFn: async () => {
      const { data } = await api.get<{ keys: string[]; sectorKeys: string[] }>(
        "/condominiums/permissions-catalog"
      );
      return data.sectorKeys?.length ? data.sectorKeys : data.keys;
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectorPermissionsData {
  sectorPermissions: string[];
  memberOverrides: Array<{
    memberId: string;
    memberName: string;
    overrides: Array<{ action: string; granted: boolean }>;
  }>;
}

interface MemberOverride {
  action: string;
  granted: boolean;
}

interface MemberPermissionsData {
  overrides: MemberOverride[];
}

// "inherit" means no override stored
type OverrideState = "inherit" | "grant" | "revoke";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSectorPermissions(condominiumId: string, sectorId: string | null) {
  return useQuery({
    queryKey: ["sectorPermissions", condominiumId, sectorId],
    queryFn: async (): Promise<SectorPermissionsData> => {
      const { data } = await api.get(
        `/structure/${condominiumId}/sectors/${sectorId}/permissions`
      );
      return data;
    },
    enabled: !!condominiumId && !!sectorId,
  });
}

function useUpdateSectorPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      condominiumId,
      sectorId,
      actions,
    }: {
      condominiumId: string;
      sectorId: string;
      actions: string[];
    }) => {
      const { data } = await api.put(
        `/structure/${condominiumId}/sectors/${sectorId}/permissions`,
        { actions }
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sectorPermissions", variables.condominiumId, variables.sectorId],
      });
    },
  });
}

function useMemberPermissions(
  condominiumId: string,
  sectorId: string | null,
  memberId: string | null
) {
  return useQuery({
    queryKey: ["memberPermissions", condominiumId, sectorId, memberId],
    queryFn: async (): Promise<MemberPermissionsData> => {
      const { data } = await api.get(
        `/structure/${condominiumId}/sectors/${sectorId}/members/${memberId}/permissions`
      );
      return data;
    },
    enabled: !!condominiumId && !!sectorId && !!memberId,
  });
}

function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      condominiumId,
      sectorId,
      memberId,
      overrides,
    }: {
      condominiumId: string;
      sectorId: string;
      memberId: string;
      overrides: MemberOverride[];
    }) => {
      const { data } = await api.put(
        `/structure/${condominiumId}/sectors/${sectorId}/members/${memberId}/permissions`,
        { overrides }
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "memberPermissions",
          variables.condominiumId,
          variables.sectorId,
          variables.memberId,
        ],
      });
    },
  });
}

function useCreateSectorMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      name,
      password,
      condominiumId,
      sectorId,
    }: {
      email: string;
      name: string;
      password: string;
      condominiumId: string;
      sectorId: string;
    }) => {
      const { data } = await api.post("/users/create-sector-member", {
        email,
        name,
        password,
        condominiumId,
        sectorId,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sectors", variables.condominiumId],
      });
    },
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectorPermissionsSectionProps {
  condominiumId: string;
  sectorId: string;
}

function SectorPermissionsSection({
  condominiumId,
  sectorId,
}: SectorPermissionsSectionProps) {
  const { toast } = useToast();
  const { data, isLoading } = useSectorPermissions(condominiumId, sectorId);
  const { data: catalogKeys, isLoading: catalogLoading } =
    useSectorCatalogPermissionKeys();
  const updatePermissions = useUpdateSectorPermissions();
  const ALL_ACTIONS = catalogKeys ?? [];

  // Inicializa localActions imediatamente quando os dados chegarem
  const [localActions, setLocalActions] = useState<string[]>(() => 
    data?.sectorPermissions ?? []
  );

  // Atualiza quando sectorId ou dados mudam
  useEffect(() => {
    if (data?.sectorPermissions) {
      setLocalActions(data.sectorPermissions);
    }
  }, [data, sectorId]);

  const handleToggle = async (action: string, enabled: boolean) => {
    const next = enabled
      ? [...localActions, action]
      : localActions.filter((a) => a !== action);

    setLocalActions(next);

    try {
      await updatePermissions.mutateAsync({ condominiumId, sectorId, actions: next });
      toast({
        title: "Permissão atualizada",
        description: `"${permissionLabel(action)}" foi ${enabled ? "habilitada" : "desabilitada"}.`,
        variant: "success",
        duration: 2000,
      });
    } catch (_error: unknown) {
      // Rollback
      setLocalActions(localActions);
      toast({
        title: "Erro ao atualizar permissão",
        description: getApiErrorMessage(_error),
        variant: "error",
        duration: 4000,
      });
    }
  };

  if (isLoading || catalogLoading || !catalogKeys?.length) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Carregando permissões...
      </div>
    );
  }

  const availableCategories = Object.entries(PERMISSION_CATEGORIES).filter(([_, cat]) =>
    cat.permissions && Object.keys(cat.permissions).some(key => ALL_ACTIONS.includes(key))
  );

  return (
    <div className="max-h-[min(420px,50vh)] overflow-y-auto pr-1 space-y-4">
      {availableCategories.map(([key, category]) => {
        const categoryPermissions = Object.entries(category.permissions).filter(
          ([permKey]) => ALL_ACTIONS.includes(permKey)
        );
        
        if (categoryPermissions.length === 0) return null;
        
        return (
          <div key={key}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {category.label}
            </h4>
            <div className="space-y-2">
              {categoryPermissions.map(([permKey, label]) => (
                <div key={permKey} className="flex items-center justify-between gap-2">
                  <Label 
                    htmlFor={`perm-${permKey}`} 
                    className="text-sm font-normal cursor-pointer text-foreground"
                  >
                    {label}
                  </Label>
                  <Switch
                    id={`perm-${permKey}`}
                    checked={localActions.includes(permKey)}
                    onCheckedChange={(checked) => handleToggle(permKey, checked)}
                    disabled={updatePermissions.isPending}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface MemberOverridePanelProps {
  condominiumId: string;
  sectorId: string;
  member: SectorMember;
}

function MemberOverridePanel({
  condominiumId,
  sectorId,
  member,
}: MemberOverridePanelProps) {
  const { toast } = useToast();
  const { data: catalogKeys, isLoading: catalogLoading } =
    useSectorCatalogPermissionKeys();
  const ALL_ACTIONS = catalogKeys ?? [];
  const { data, isLoading } = useMemberPermissions(
    condominiumId,
    sectorId,
    member.id
  );
  const updateMemberPerms = useUpdateMemberPermissions();

  // Map action -> OverrideState derived from server data
  const getOverrideState = (action: string): OverrideState => {
    if (!data?.overrides) return "inherit";
    const found = data.overrides.find((o) => o.action === action);
    if (!found) return "inherit";
    return found.granted ? "grant" : "revoke";
  };

  const [localOverrides, setLocalOverrides] = useState<Record<string, OverrideState>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      const map: Record<string, OverrideState> = {};
      ALL_ACTIONS.forEach((a) => {
        map[a] = getOverrideState(a);
      });
      setLocalOverrides(map);
      setInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, initialized]);

  useEffect(() => {
    setInitialized(false);
    setLocalOverrides({});
  }, [member.id, sectorId]);

  const handleOverrideChange = async (action: string, value: OverrideState) => {
    const prev = { ...localOverrides };
    const next = { ...localOverrides, [action]: value };
    setLocalOverrides(next);

    // Build the overrides array: only include non-inherit entries
    const overridesPayload: MemberOverride[] = ALL_ACTIONS.filter(
      (a) => next[a] !== "inherit"
    ).map((a) => ({
      action: a,
      granted: next[a] === "grant",
    }));

    try {
      await updateMemberPerms.mutateAsync({
        condominiumId,
        sectorId,
        memberId: member.id,
        overrides: overridesPayload,
      });
      toast({
        title: "Permissão do membro atualizada",
        variant: "success",
        duration: 2000,
      });
    } catch (_error: unknown) {
      setLocalOverrides(prev);
      toast({
        title: "Erro ao atualizar",
        description: getApiErrorMessage(_error),
        variant: "error",
        duration: 4000,
      });
    }
  };

  if (isLoading || catalogLoading || !catalogKeys?.length) {
    return (
      <div className="text-sm text-muted-foreground py-1">
        Carregando...
      </div>
    );
  }

  const availableCategories = Object.entries(PERMISSION_CATEGORIES).filter(([_, cat]) =>
    cat.permissions && Object.keys(cat.permissions).some(key => ALL_ACTIONS.includes(key))
  );

  return (
    <div className="pl-4 border-l-2 border-border mt-2 max-h-[min(320px,40vh)] overflow-y-auto space-y-3">
      {/* Legenda explicativa */}
      <div className="bg-muted/30 rounded-md p-2 text-[10px] grid grid-cols-3 gap-2">
        <div className="flex flex-col">
          <span className="font-medium text-green-600">Herdar</span>
          <span className="text-muted-foreground">Segue o setor</span>
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-blue-600">Conceder</span>
          <span className="text-muted-foreground">Permite acesso</span>
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-red-600">Bloquear</span>
          <span className="text-muted-foreground">Remove acesso</span>
        </div>
      </div>

      {availableCategories.map(([key, category]) => {
        const categoryPermissions = Object.entries(category.permissions).filter(
          ([permKey]) => ALL_ACTIONS.includes(permKey)
        );
        
        if (categoryPermissions.length === 0) return null;
        
        return (
          <div key={key}>
            <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {category.label}
            </h5>
            <div className="space-y-1.5">
              {categoryPermissions.map(([permKey, label]) => {
                const currentValue = localOverrides[permKey] ?? "inherit";
                return (
                  <div key={permKey} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground flex-1">{label}</span>
                    <div className="flex rounded-md border text-[10px] overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOverrideChange(permKey, "inherit")}
                        disabled={updateMemberPerms.isPending}
                        className={`px-2 py-1 transition-colors ${
                          currentValue === "inherit"
                            ? "bg-green-100 text-green-700 font-medium"
                            : "bg-background hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        Herdar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOverrideChange(permKey, "grant")}
                        disabled={updateMemberPerms.isPending}
                        className={`px-2 py-1 transition-colors border-l ${
                          currentValue === "grant"
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : "bg-background hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        Conceder
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOverrideChange(permKey, "revoke")}
                        disabled={updateMemberPerms.isPending}
                        className={`px-2 py-1 transition-colors border-l ${
                          currentValue === "revoke"
                            ? "bg-red-100 text-red-700 font-medium"
                            : "bg-background hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        Bloquear
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface MembersSectionProps {
  condominiumId: string;
  sectorId: string;
  members: SectorMember[];
}

function MembersSection({ condominiumId, sectorId, members }: MembersSectionProps) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  if (members.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhum membro neste setor.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isExpanded = expandedMemberId === member.id;
        const memberName = member.name || member.user?.name || member.userId;
        const memberEmail = member.email || member.user?.email;
        return (
          <div key={member.id} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {memberName}
                  </p>
                  {memberEmail && (
                    <p className="text-xs text-muted-foreground truncate">
                      {memberEmail}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 gap-1 text-xs"
                onClick={() =>
                  setExpandedMemberId(isExpanded ? null : member.id)
                }
              >
                <Shield className="h-3.5 w-3.5" />
                Permissoes
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {isExpanded && (
              <MemberOverridePanel
                condominiumId={condominiumId}
                sectorId={sectorId}
                member={member}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface CreateMemberFormProps {
  condominiumId: string;
  sectorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateMemberForm({
  condominiumId,
  sectorId,
  onSuccess,
  onCancel,
}: CreateMemberFormProps) {
  const { toast } = useToast();
  const createMember = useCreateSectorMember();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !name.trim() || !password.trim()) {
      toast({
        title: "Preencha todos os campos",
        description: "Email, nome e senha são obrigatórios.",
        variant: "error",
        duration: 3000,
      });
      return;
    }

    try {
      await createMember.mutateAsync({
        email: email.trim(),
        name: name.trim(),
        password,
        condominiumId,
        sectorId,
      });
      toast({
        title: "Membro criado!",
        description: "O novo membro foi adicionado ao setor.",
        variant: "success",
        duration: 3000,
      });
      onSuccess();
    } catch (_error: unknown) {
      toast({
        title: "Erro ao criar membro",
        description: getApiErrorMessage(_error),
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="member-name">Nome</Label>
        <Input
          id="member-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
          disabled={createMember.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="member-email">Email</Label>
        <Input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          disabled={createMember.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="member-password">Senha</Label>
        <Input
          id="member-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha inicial"
          disabled={createMember.isPending}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={createMember.isPending}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={createMember.isPending}
        >
          {createMember.isPending ? "Criando..." : "Criar Membro"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface AddExistingMemberFormProps {
  condominiumId: string;
  sectorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function AddExistingMemberForm({
  condominiumId,
  sectorId,
  onSuccess,
  onCancel,
}: AddExistingMemberFormProps) {
  const { toast } = useToast();
  const { data: availableMembers = [], isLoading } = useAvailableMembers(
    condominiumId,
    sectorId
  );
  const addMember = useAddExistingMember();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({
        title: "Selecione um membro",
        description: "Escolha um usuário da lista.",
        variant: "error",
        duration: 3000,
      });
      return;
    }

    try {
      await addMember.mutateAsync({
        condominiumId,
        sectorId,
        userId: selectedUserId,
      });
      toast({
        title: "Membro adicionado!",
        description: "O usuário foi adicionado ao setor.",
        variant: "success",
        duration: 3000,
      });
      onSuccess();
    } catch (_error: unknown) {
      toast({
        title: "Erro ao adicionar membro",
        description: getApiErrorMessage(_error),
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Card className="border-dashed border-primary/40">
      <CardContent className="p-3 space-y-3">
        <p className="text-sm font-medium">Adicionar membro existente</p>
        <Select
          value={selectedUserId}
          onValueChange={setSelectedUserId}
          disabled={isLoading || addMember.isPending}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione um usuário" />
          </SelectTrigger>
          <SelectContent>
            {availableMembers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={addMember.isPending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={addMember.isPending || !selectedUserId}
          >
            {addMember.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

interface SectorManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominiumId: string;
  /** Quando definido, abre já no setor indicado (ex.: hub de acessos). */
  initialSectorId?: string | null;
  /** Quando true, mostra apenas o setor inicial sem lista de setores */
  singleSectorMode?: boolean;
}

export const SectorManagementDialog = ({
  open,
  onOpenChange,
  condominiumId,
  initialSectorId = null,
  singleSectorMode = false,
}: SectorManagementDialogProps) => {
  const { toast } = useToast();
  const { data: sectors = [], isLoading } = useSectors(condominiumId);
  const createSector = useCreateSector();
  const updateSector = useUpdateSector();
  const deleteSector = useDeleteSector();

  const [showForm, setShowForm] = useState(false);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [sectorName, setSectorName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [allowedForwardingIds, setAllowedForwardingIds] = useState<string[]>([]);

  // Expanded sections state for the edit form
  const [showPermissions, setShowPermissions] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showAddExistingMember, setShowAddExistingMember] = useState(false);

  const isMutating =
    createSector.isPending ||
    updateSector.isPending ||
    deleteSector.isPending;

  // The full sector object for the one being edited (for members list)
  const editingSector = editingSectorId
    ? sectors.find((s) => s.id === editingSectorId)
    : null;

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (open && initialSectorId) {
      setEditingSectorId(initialSectorId);
      setShowForm(false);
      setShowPermissions(true);
      setShowMembers(true);
    }
  }, [open, initialSectorId]);

  // Preencher campos do formulário quando editingSectorId mudar e não for modo criação
  useEffect(() => {
    if (editingSectorId && !showForm && editingSector) {
      setSectorName(editingSector.name);
      setCategories(editingSector.categories ?? []);
      setAllowedForwardingIds(editingSector.allowedForwardingIds ?? []);
    }
  }, [editingSectorId, showForm, editingSector]);

  const resetForm = () => {
    setShowForm(false);
    setEditingSectorId(null);
    setSectorName("");
    setCategories([]);
    setCategoryInput("");
    setAllowedForwardingIds([]);
    setShowPermissions(false);
    setShowMembers(false);
    setShowCreateMember(false);
  };

  const handleAddCategory = () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      toast({
        title: "Categoria duplicada",
        description: "Essa categoria já foi adicionada.",
        variant: "error",
        duration: 3000,
      });
      return;
    }
    setCategories([...categories, trimmed]);
    setCategoryInput("");
  };

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter((c) => c !== category));
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCategory();
    }
  };

  const handleEdit = (sector: {
    id: string;
    name: string;
    categories: string[];
    allowedForwardingIds?: string[];
  }) => {
    setEditingSectorId(sector.id);
    setSectorName(sector.name);
    setCategories([...sector.categories]);
    setCategoryInput("");
    setAllowedForwardingIds([...(sector.allowedForwardingIds ?? [])]);
    setShowPermissions(false);
    setShowMembers(false);
    setShowCreateMember(false);
    setShowForm(true);
  };

  const handleDelete = async (sectorId: string) => {
    try {
      await deleteSector.mutateAsync({ condominiumId, sectorId });
      toast({
        title: "Setor removido!",
        description: "O setor foi removido com sucesso.",
        variant: "success",
        duration: 3000,
      });
    } catch (_error: unknown) {
      toast({
        title: "Erro ao remover",
        description: getApiErrorMessage(_error),
        variant: "error",
        duration: 5000,
      });
    }
  };

  const handleSave = async () => {
    if (!sectorName.trim()) {
      toast({
        title: "Erro de validação",
        description: "O nome do setor é obrigatório.",
        variant: "error",
        duration: 3000,
      });
      return;
    }

    try {
      if (editingSectorId) {
        await updateSector.mutateAsync({
          condominiumId,
          sectorId: editingSectorId,
          name: sectorName.trim(),
          categories,
          allowedForwardingIds,
        });
        toast({
          title: "Setor atualizado!",
          description: "O setor foi atualizado com sucesso.",
          variant: "success",
          duration: 3000,
        });
      } else {
        await createSector.mutateAsync({
          condominiumId,
          name: sectorName.trim(),
          categories,
          allowedForwardingIds,
        });
        toast({
          title: "Setor criado!",
          description: "O novo setor foi criado com sucesso.",
          variant: "success",
          duration: 3000,
        });
      }
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: getApiErrorMessage(error),
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-2xl max-h-[85dvh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Gerenciar Setores
          </DialogTitle>
          <DialogDescription>
            Crie e edite os setores de atendimento e suas categorias
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Modo criação - só mostra o botão quando não está em modo setor único */}
          {!showForm && !singleSectorMode && (
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="w-full"
              disabled={isMutating}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Setor
            </Button>
          )}

          {/* Modo edição - mostra apenas quando NÃO está em modo setor único */}
          {showForm && !singleSectorMode && (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold text-foreground">
                  {editingSectorId ? "Editar Setor" : "Novo Setor"}
                </h4>

                {/* ── Name ───────────────────────────────────────────── */}
                <div className="space-y-2">
                  <Label htmlFor="sector-name">Nome do Setor</Label>
                  <Input
                    id="sector-name"
                    value={sectorName}
                    onChange={(e) => setSectorName(e.target.value)}
                    placeholder="Ex: Manutenção, Financeiro..."
                  />
                </div>

                {/* ── Categories ─────────────────────────────────────── */}
                <div className="space-y-2">
                  <Label htmlFor="category-input">Categorias</Label>
                  <div className="flex gap-2">
                    <Input
                      id="category-input"
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      placeholder="Digite uma categoria e pressione Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCategory}
                      disabled={!categoryInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {categories.map((category) => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Tag className="h-3 w-3" />
                          {category}
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(category)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Routing / Encaminhamentos ──────────────────────── */}
                <div className="space-y-2">
                  <Label>Regras de Encaminhamento</Label>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Selecione quais setores este setor pode encaminhar as ocorrências. (Apenas Administração já está liberado por padrão para todos).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 bg-muted/20 p-3 rounded-md border border-border">
                    {sectors.filter(s => s.id !== editingSectorId).length === 0 ? (
                      <span className="text-xs text-muted-foreground">Nenhum outro setor disponível.</span>
                    ) : (
                      sectors.filter(s => s.id !== editingSectorId).map(sector => (
                      <div key={sector.id} className="flex items-center gap-2">
                         <Switch
                           id={`forward-${sector.id}`}
                           checked={allowedForwardingIds.includes(sector.id)}
                           onCheckedChange={(checked) => {
                             if (checked) {
                               setAllowedForwardingIds([...allowedForwardingIds, sector.id]);
                             } else {
                               setAllowedForwardingIds(allowedForwardingIds.filter(id => id !== sector.id));
                             }
                           }}
                         />
                         <Label 
                           htmlFor={`forward-${sector.id}`} 
                           className="text-sm cursor-pointer font-medium hover:text-primary transition-colors"
                         >
                           {sector.name}
                         </Label>
                      </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ── Permissions (only when editing) ───────────────── */}
                {editingSectorId && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => setShowPermissions((p) => !p)}
                      >
                        <span className="flex items-center gap-2 font-semibold text-sm">
                          <Shield className="h-4 w-4" />
                          Permissoes do Setor
                        </span>
                        {showPermissions ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {showPermissions && (
                        <SectorPermissionsSection
                          condominiumId={condominiumId}
                          sectorId={editingSectorId}
                        />
                      )}
                    </div>

                    {/* ── Members & overrides ──────────────────────── */}
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          className="flex flex-1 items-center justify-between text-left"
                          onClick={() => setShowMembers((p) => !p)}
                        >
                          <span className="flex items-center gap-2 font-semibold text-sm">
                            <Users className="h-4 w-4" />
                            Membros
                            {editingSector?.members?.length
                              ? ` (${editingSector.members.length})`
                              : ""}
                          </span>
                          {showMembers ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2 h-7 gap-1 text-xs shrink-0"
                          onClick={() => {
                            setShowCreateMember((p) => !p);
                            if (!showMembers) setShowMembers(true);
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Criar membro
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-7 gap-1 text-xs shrink-0"
                          onClick={() => {
                            setShowAddExistingMember((p) => !p);
                            if (!showMembers) setShowMembers(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar existente
                        </Button>
                      </div>

                      {showMembers && (
                        <div className="space-y-3">
                          {showCreateMember && (
                            <Card className="border-dashed border-primary/40">
                              <CardContent className="p-3">
                                <p className="text-sm font-medium mb-1">Novo membro</p>
                                <CreateMemberForm
                                  condominiumId={condominiumId}
                                  sectorId={editingSectorId}
                                  onSuccess={() => setShowCreateMember(false)}
                                  onCancel={() => setShowCreateMember(false)}
                                />
                              </CardContent>
                            </Card>
                          )}

                          {showAddExistingMember && (
                            <AddExistingMemberForm
                              condominiumId={condominiumId}
                              sectorId={editingSectorId}
                              onSuccess={() => setShowAddExistingMember(false)}
                              onCancel={() => setShowAddExistingMember(false)}
                            />
                          )}

                          <MembersSection
                            condominiumId={condominiumId}
                            sectorId={editingSectorId}
                            members={editingSector?.members ?? []}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Form actions ───────────────────────────────────── */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetForm}
                    disabled={isMutating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isMutating}
                  >
                    {isMutating
                      ? "Salvando..."
                      : editingSectorId
                        ? "Salvar Alteracoes"
                        : "Criar Setor"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando setores...
            </div>
          ) : singleSectorMode && editingSectorId ? (
            // Modo de setor único - UI limpa para gerenciar permissões e membros
            <div className="space-y-6">
              {/* Header do Setor */}
              <div className="bg-muted/30 rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{editingSector?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {editingSector?.members?.length ?? 0} membro(s) • Gerencie permissões e membros abaixo
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Permissões do Setor */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => setShowPermissions((p) => !p)}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Permissões do Setor
                  </span>
                  {showPermissions ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {showPermissions && (
                  <div className="p-4 border-t">
                    <SectorPermissionsSection
                      condominiumId={condominiumId}
                      sectorId={editingSectorId}
                    />
                  </div>
                )}
              </div>

              {/* Membros */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-muted/50">
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-between text-left"
                    onClick={() => setShowMembers((p) => !p)}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Users className="h-4 w-4 text-green-500" />
                      Membros
                      {editingSector?.members?.length
                        ? ` (${editingSector.members.length})`
                        : ""}
                    </span>
                    {showMembers ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 h-8 gap-1.5 text-xs"
                    onClick={() => {
                      setShowAddExistingMember((p) => !p);
                      if (!showMembers) setShowMembers(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>

                {showMembers && (
                  <div className="p-4 border-t space-y-3">
                    {showAddExistingMember && (
                      <AddExistingMemberForm
                        condominiumId={condominiumId}
                        sectorId={editingSectorId}
                        onSuccess={() => setShowAddExistingMember(false)}
                        onCancel={() => setShowAddExistingMember(false)}
                      />
                    )}

                    <MembersSection
                      condominiumId={condominiumId}
                      sectorId={editingSectorId}
                      members={editingSector?.members ?? []}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : sectors.length === 0 && !showForm ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum setor cadastrado. Clique em "Novo Setor" para criar.
            </div>
          ) : (
            sectors.map((sector) => (
              <Card key={sector.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <FolderKanban className="h-4 w-4" />
                        {sector.name}
                      </h4>
                      {sector.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {sector.categories.map((category) => (
                            <Badge
                              key={category}
                              variant="secondary"
                              className="text-xs"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(sector)}
                        disabled={isMutating || showForm}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sector.id)}
                        disabled={isMutating}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMutating}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
