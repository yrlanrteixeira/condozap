import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Users, FolderKanban, Settings2, User } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/shared/utils/errorMessages";
import { useAppSelector } from "@/shared/hooks/useAppSelector";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { useCondominiumUsers } from "@/features/user-management/hooks/useUserManagementApi";
import { useSectors } from "@/features/structure/hooks/useSectorsApi";
import { SectorManagementDialog } from "@/features/structure/components/SectorManagementDialog";
import { permissionLabel } from "@/config/permissionLabels";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { useToast } from "@/shared/components/ui/use-toast";
import { fetchCurrentUser } from "@/shared/store/slices/authSlice";
import { useAppDispatch } from "@/shared/hooks/useAppDispatch";
import { useAuth } from "@/shared/hooks/useAuth";

type PermissionMode = "ROLE_DEFAULT" | "CUSTOM";

export function AccessHubPage() {
  const condominiumId = useAppSelector(selectCurrentCondominiumId) ?? "";
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();
  const { data: catalog } = useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: async () => {
      const { data } = await api.get<{ keys: string[] }>(
        "/condominiums/permissions-catalog"
      );
      return data.keys;
    },
    enabled: !!condominiumId,
  });

  const { data: team, isLoading: teamLoading } =
    useCondominiumUsers(condominiumId);
  const { data: sectors, isLoading: sectorsLoading } =
    useSectors(condominiumId);

  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  const openMemberSheet = (userId: string) => {
    setEditUserId(userId);
    setSheetOpen(true);
  };

  const selectedMember = useMemo(
    () => team?.find((u) => u.id === editUserId),
    [team, editUserId]
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Acessos e permissões
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina o acesso de cada membro e setor no condomínio ativo.
          </p>
        </div>
      </div>

      {!condominiumId ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Escolha um condomínio no seletor para configurar acessos.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="team" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="sectors" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Setores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Membros da equipe
                </CardTitle>
                <CardDescription>
                  Personalize o acesso por vínculo ou mantenha o padrão do papel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {teamLoading && (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                )}
                {!teamLoading && (!team || team.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum membro encontrado.
                  </p>
                )}
                {team?.map((u) => {
                  const isCurrentUser = u.id === currentUser?.id;
                  return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{u.name}</p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              Você
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                        {u.email} · {u.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.role === "SYNDIC" ||
                      u.role === "PROFESSIONAL_SYNDIC" ? (
                        <Badge variant="secondary">Acesso completo (síndico)</Badge>
                      ) : isCurrentUser ? (
                        <Badge variant="outline">Sem autoedição</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMemberSheet(u.id)}
                        >
                          <Settings2 className="h-4 w-4 mr-1" />
                          Configurar
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sectors" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Setores</CardTitle>
                <CardDescription>
                  Abra o painel de setor para ajustar permissões e membros (mesmo fluxo da estrutura).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sectorsLoading && (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                )}
                {!sectorsLoading && (!sectors || sectors.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum setor cadastrado. Crie setores em Estrutura.
                  </p>
                )}
                {sectors?.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.members?.length ?? 0} membro(s)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSectorId(s.id);
                        setSectorDialogOpen(true);
                      }}
                    >
                      Editar permissões
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {condominiumId && (
        <SectorManagementDialog
          open={sectorDialogOpen}
          onOpenChange={(o) => {
            setSectorDialogOpen(o);
            if (!o) setSelectedSectorId(null);
          }}
          condominiumId={condominiumId}
          initialSectorId={selectedSectorId}
          singleSectorMode={!!selectedSectorId}
        />
      )}

      <MembershipPermissionsSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditUserId(null);
        }}
        condominiumId={condominiumId}
        userId={editUserId}
        targetName={selectedMember?.name}
        catalogKeys={catalog ?? []}
        onSaved={() => {
          void dispatch(fetchCurrentUser());
        }}
      />
    </div>
  );
}

function MembershipPermissionsSheet({
  open,
  onOpenChange,
  condominiumId,
  userId,
  targetName,
  catalogKeys,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominiumId: string;
  userId: string | null;
  targetName?: string;
  catalogKeys: string[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["membership-permissions", condominiumId, userId],
    queryFn: async () => {
      const { data: d } = await api.get<{
        permissionMode: PermissionMode;
        actions: string[];
        effectivePermissions: string[];
      }>(`/condominiums/${condominiumId}/members/${userId}/permissions`);
      return d;
    },
    enabled: open && !!condominiumId && !!userId,
  });

  const [mode, setMode] = useState<PermissionMode>("ROLE_DEFAULT");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data) {
      setMode(data.permissionMode);
      setSelected(new Set(data.actions));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/condominiums/${condominiumId}/members/${userId}/permissions`, {
        permissionMode: mode,
        actions: mode === "CUSTOM" ? [...selected] : [],
      });
    },
    onSuccess: () => {
      toast({ title: "Permissões salvas", variant: "success" });
      qc.invalidateQueries({
        queryKey: ["membership-permissions", condominiumId, userId],
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      toast({
        title: "Erro ao salvar",
        description: getApiErrorMessage(e),
        variant: "error",
      });
    },
  });

  const toggle = (key: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(key);
    else next.delete(key);
    setSelected(next);
  };

  const grouped = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const k of catalogKeys) {
      const prefix = k.split(":")[0] ?? "outros";
      if (!m.has(prefix)) m.set(prefix, []);
      m.get(prefix)!.push(k);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalogKeys]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Permissões do membro</SheetTitle>
          <SheetDescription>
            {targetName ?? "Usuário"} — ajuste fino sobre o teto do papel.
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <p className="text-sm text-muted-foreground py-6">Carregando...</p>
        )}

        {!isLoading && data && (
          <>
            <div className="flex items-center justify-between gap-2 py-2 border-b border-border">
              <div className="space-y-0.5">
                <Label htmlFor="perm-mode">Permissões personalizadas</Label>
                <p className="text-xs text-muted-foreground">
                  Desligado = usa o padrão do papel no condomínio.
                </p>
              </div>
              <Switch
                id="perm-mode"
                checked={mode === "CUSTOM"}
                onCheckedChange={(c) => setMode(c ? "CUSTOM" : "ROLE_DEFAULT")}
              />
            </div>

            {data.effectivePermissions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Efetivo hoje: <strong>{data.effectivePermissions.length}</strong> permissões
              </p>
            )}

            {mode === "CUSTOM" && (
              <ScrollArea className="flex-1 h-[min(50vh,420px)] pr-3 -mr-1">
                <div className="space-y-6 pb-4">
                  {grouped.map(([prefix, keys]) => (
                    <div key={prefix}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {prefix}
                      </p>
                      <div className="space-y-2">
                        {keys.map((key) => (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-2"
                          >
                            <Label
                              htmlFor={`p-${key}`}
                              className="text-sm font-normal cursor-pointer leading-snug"
                            >
                              {permissionLabel(key)}
                            </Label>
                            <Switch
                              id={`p-${key}`}
                              checked={selected.has(key)}
                              onCheckedChange={(c) => toggle(key, c)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        )}

        <SheetFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void saveMutation.mutateAsync()}
            disabled={saveMutation.isPending || isLoading || !userId}
          >
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
