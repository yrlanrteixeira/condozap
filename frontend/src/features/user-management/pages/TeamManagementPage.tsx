/**
 * Team Management Page (Conselheiros)
 * 
 * Página para síndicos gerenciarem conselheiros e pessoas de confiança
 * - Síndico pode cadastrar ADMINs (conselheiros)
 * - Apenas SUPER_ADMIN (desenvolvedor) pode criar/vincular síndicos
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  UserPlus, 
  MoreVertical, 
  Shield, 
  ShieldCheck, 
  User, 
  Trash2,
  Loader2,
  Crown,
} from 'lucide-react';
import { useAppSelector } from '@/hooks';
import { selectCurrentCondominiumId } from '@/store/slices/condominiumSlice';
import { useCondominiumUsers, useRemoveUser, useUpdateUserRole } from '../hooks/useUserManagementApi';
import { CreateAdminDialog } from '../components/CreateAdminDialog';
import { CreateSyndicDialog } from '../components/CreateSyndicDialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { CondominiumUser } from '../types';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Desenvolvedor',
  PROFESSIONAL_SYNDIC: 'Síndico Profissional',
  ADMIN: 'Conselheiro',
  SYNDIC: 'Síndico',
  RESIDENT: 'Morador',
};

const roleIcons: Record<string, typeof Shield> = {
  SUPER_ADMIN: Crown,
  PROFESSIONAL_SYNDIC: ShieldCheck,
  ADMIN: Shield,
  SYNDIC: ShieldCheck,
  RESIDENT: User,
};

const statusColors: Record<string, string> = {
  APPROVED: 'bg-green-500/10 text-green-500 border-green-500/20',
  PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
  SUSPENDED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
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
  const [showCreateSyndicDialog, setShowCreateSyndicDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<CondominiumUser | null>(null);

  const { data: users = [], isLoading, refetch } = useCondominiumUsers(currentCondominiumId || '');
  const removeUserMutation = useRemoveUser();
  const updateRoleMutation = useUpdateUserRole();

  // Filtrar conselheiros (ADMINs) e síndicos deste condomínio
  // SUPER_ADMIN não aparece aqui pois é o desenvolvedor
  const managers = users.filter(u => ['ADMIN', 'SYNDIC'].includes(u.role));
  const residents = users.filter(u => u.role === 'RESIDENT');
  
  // Verificar se o usuário atual é SUPER_ADMIN
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

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
    } catch (error: any) {
      toast({
        title: 'Erro ao remover usuário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'ADMIN' | 'SYNDIC' | 'RESIDENT') => {
    try {
      await updateRoleMutation.mutateAsync({ userId, newRole });
      toast({
        title: 'Função atualizada',
        description: `Usuário agora é ${roleLabels[newRole]}.`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar função',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isSuperAdmin ? 'Gerenciar Equipe' : 'Conselheiros'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? 'Gerencie síndicos e conselheiros do sistema'
                : 'Cadastre pessoas de confiança para ajudar a gerenciar o condomínio'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isSuperAdmin && (
            <Button onClick={() => setShowCreateSyndicDialog(true)} variant="outline">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Novo Síndico
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Conselheiro
          </Button>
        </div>
      </div>

      {/* Managers Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Conselheiros e Síndicos
          </CardTitle>
          <CardDescription>
            Pessoas com permissão para gerenciar o condomínio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {managers.length > 0 ? (
            <div className="space-y-3">
              {managers.map((user) => {
                const RoleIcon = roleIcons[user.role] || User;
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

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={statusColors[user.status]}>
                        {statusLabels[user.status]}
                      </Badge>
                      <Badge variant="secondary">
                        {roleLabels[user.role]}
                      </Badge>

                      {/* Síndico só pode gerenciar ADMINs (conselheiros), não outros síndicos */}
                      {/* SUPER_ADMIN pode gerenciar todos */}
                      {!isCurrentUser && (
                        (isSuperAdmin || (user.role === 'ADMIN')) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Apenas SUPER_ADMIN pode alterar roles */}
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'ADMIN')}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Tornar Conselheiro
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'SYNDIC')}>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Tornar Síndico
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem 
                                onClick={() => setUserToDelete(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover do Condomínio
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum conselheiro cadastrado.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Conselheiro
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

      {/* Create Syndic Dialog (SUPER_ADMIN only) */}
      {isSuperAdmin && (
        <CreateSyndicDialog
          open={showCreateSyndicDialog}
          onOpenChange={setShowCreateSyndicDialog}
          onSuccess={() => refetch()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
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

