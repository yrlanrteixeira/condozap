/**
 * Membros ativos — gestão de síndicos e administradores do condomínio e da função de cada um.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import {
  Users,
  UserPlus,
  MoreVertical,
  Shield,
  ShieldCheck,
  User,
  Trash2,
  Loader2,
} from 'lucide-react';
import { PageHeaderSkeleton, ListItemSkeleton } from '@/shared/components/ui/skeleton';
import { useAppSelector } from '@/shared/hooks';
import { selectCurrentCondominiumId } from '@/shared/store/slices/condominiumSlice';
import { useCondominiumUsers, useRemoveUser, useUpdateCouncilPosition } from '../hooks/useUserManagementApi';
import { CreateAdminDialog } from '../components/CreateAdminDialog';
import { useToast } from '@/shared/components/ui/use-toast';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CondominiumUser } from '../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useStructure } from '@/features/structure/hooks/useStructureApi';
import {
  MEMBER_FUNCTION_GROUPS,
  KNOWN_MEMBER_FUNCTION_VALUES,
} from '../constants/memberFunctions';

const roleLabels: Record<string, string> = {
  PROFESSIONAL_SYNDIC: 'Síndico Profissional',
  ADMIN: 'Conselheiro',
  SYNDIC: 'Síndico',
  RESIDENT: 'Morador',
};

const roleIcons: Record<string, typeof Shield> = {
  PROFESSIONAL_SYNDIC: ShieldCheck,
  ADMIN: Shield,
  SYNDIC: ShieldCheck,
  RESIDENT: User,
};

const statusColors: Record<string, string> = {
  APPROVED: 'bg-success/10 text-success border-success/20',
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
  SUSPENDED: 'bg-muted text-muted-foreground border-border',
};

const statusLabels: Record<string, string> = {
  APPROVED: 'Ativo',
  PENDING: 'Pendente',
  REJECTED: 'Rejeitado',
  SUSPENDED: 'Suspenso',
};

export function TeamManagementPage() {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<CondominiumUser | null>(null);

  const { data: users = [], isLoading, refetch } = useCondominiumUsers(currentCondominiumId || '');
  const removeUserMutation = useRemoveUser();
  const updateCouncilPositionMutation = useUpdateCouncilPosition();
  const queryClient = useQueryClient();

  const { data: structureData } = useStructure(currentCondominiumId || '');
  const towers = useMemo(() => {
    if (!structureData?.structure?.towers) return [];
    return structureData.structure.towers.map((t) => t.name).sort();
  }, [structureData]);

  const updateAssignedTowerMutation = useMutation({
    mutationFn: async ({ userId, assignedTower }: { userId: string; assignedTower: string | null }) => {
      const { data } = await api.patch(`/api/users/${userId}/assigned-tower`, {
        assignedTower,
        condominiumId: currentCondominiumId,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  // Membros com papel de gestão neste condomínio (síndico e administradores)
  const managers = users.filter(u => ['ADMIN', 'SYNDIC'].includes(u.role));
  const residents = users.filter(u => u.role === 'RESIDENT');

  const handleRemoveUser = async () => {
    if (!userToDelete || !currentCondominiumId) return;

    try {
      await removeUserMutation.mutateAsync({
        userId: userToDelete.id,
        condominiumId: currentCondominiumId,
      });

      toast({
        title: 'Usuário removido',
        description: `${userToDelete.name} foi removido do condomínio.`,
      });

      setUserToDelete(null);
      refetch();
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message || 'Erro ao remover usuário.';
      toast({
        title: 'Erro ao remover usuário',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleCouncilPositionChange = async (userId: string, councilPosition: string | null) => {
    if (!currentCondominiumId) return;
    const value = councilPosition?.trim() || null;
    try {
      await updateCouncilPositionMutation.mutateAsync({
        userId,
        condominiumId: currentCondominiumId,
        councilPosition: value,
      });
      toast({
        title: 'Função atualizada',
        description: value ? `Função definida: ${value}` : 'Função removida.',
      });
      refetch();
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message || 'Erro ao atualizar função.';
      toast({
        title: 'Erro ao atualizar função',
        description: message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeaderSkeleton />
        <Card className="border-border">
          <CardHeader>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </CardHeader>
          <CardContent>
            <ListItemSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentCondominiumId) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Selecione um condomínio para gerenciar a equipe.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Membros ativos
            </h1>
            <p className="text-sm text-muted-foreground">
              Quem tem acesso de gestão no condomínio e a função de cada pessoa
            </p>
          </div>
        </div>

        <div className="flex gap-2">

          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Membro
          </Button>
        </div>
      </div>

      {/* Membros com acesso de gestão */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Membros ativos
          </CardTitle>
          <CardDescription>
            Síndico e demais perfis administrativos; ajuste a função de cada um no condomínio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {managers.length > 0 ? (
            <div className="space-y-3">
              {managers.map((user) => {
                const RoleIcon = roleIcons[user.role] ?? User;
                const isCurrentUser = user.id === currentUser?.id;

                return (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        <RoleIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{user.name}</p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">Você</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className={statusColors[user.status]}>
                        {statusLabels[user.status]}
                      </Badge>
                      <Badge variant="secondary">
                        {roleLabels[user.role]}
                      </Badge>

                      {/* Função no condomínio (rótulo; permissões vêm do papel no sistema) */}
                      <Select
                        value={user.councilPosition ?? '__none__'}
                        onValueChange={(value) => handleCouncilPositionChange(user.id, value === '__none__' ? null : value)}
                        disabled={updateCouncilPositionMutation.isPending}
                      >
                        <SelectTrigger className="w-full sm:min-w-[200px] sm:w-[220px] h-9">
                          <SelectValue placeholder="Função no condomínio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem função definida</SelectItem>
                          {MEMBER_FUNCTION_GROUPS.map((group) => (
                            <SelectGroup key={group.label}>
                              <SelectLabel>{group.label}</SelectLabel>
                              {group.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                          {user.councilPosition &&
                            !KNOWN_MEMBER_FUNCTION_VALUES.has(user.councilPosition) && (
                              <SelectItem value={user.councilPosition}>
                                {user.councilPosition}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>

                      {/* Torre atribuída — administradores com função definida */}
                      {user.role === 'ADMIN' && user.councilPosition && (
                        <Select
                          value={user.assignedTower ?? '__none__'}
                          onValueChange={(value) =>
                            updateAssignedTowerMutation.mutate({
                              userId: user.id,
                              assignedTower: value === '__none__' ? null : value,
                            })
                          }
                          disabled={updateAssignedTowerMutation.isPending}
                        >
                          <SelectTrigger className="w-full sm:w-[140px] h-9">
                            <SelectValue placeholder="Torre" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Todas torres</SelectItem>
                            {towers.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Síndico pode remover ADMINs, mas não outros síndicos */}
                      {!isCurrentUser && user.role === 'ADMIN' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setUserToDelete(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover do Condomínio
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum membro cadastrado.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Membro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Residents Section (Summary) */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Moradores com Acesso ao Sistema
          </CardTitle>
          <CardDescription>
            Moradores que podem acessar o sistema (apenas visualização)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-2xl font-bold text-foreground">{residents.length}</p>
              <p className="text-sm text-muted-foreground">moradores com acesso</p>
            </div>
            <Button variant="outline" asChild>
              <a href="/residents">Ver Moradores</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Admin Dialog */}
      <CreateAdminDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="w-[95%] sm:max-w-lg max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{userToDelete?.name}</strong> do condomínio?
              Esta ação pode ser desfeita posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeUserMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

