/**
 * User Approval Page
 * 
 * Página para síndicos/admins aprovarem novos cadastros de usuários
 */

import { UserCheck, Loader2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAppSelector } from '@/hooks';
import { selectCurrentCondominiumId } from '@/store/slices/condominiumSlice';
import { usePendingUsers, useApproveUser, useRejectUser } from '../hooks/useUserApprovalApi';
import { PendingUserCard } from '../components/PendingUserCard';
import { useToast } from '@/components/ui/use-toast';
import type { ApproveUserInput } from '../types';

export function UserApprovalPage() {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { toast } = useToast();

  const {
    data: pendingUsers = [],
    isLoading,
    isError,
  } = usePendingUsers(currentCondominiumId || '');

  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();

  const handleApprove = async (
    userId: string,
    tower: string,
    floor: string,
    unit: string,
    type: 'OWNER' | 'TENANT'
  ) => {
    if (!currentCondominiumId) {
      toast({
        title: 'Erro',
        description: 'Selecione um condomínio.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const input: ApproveUserInput = {
        userId,
        condominiumId: currentCondominiumId,
        tower,
        floor,
        unit,
        type,
      };

      await approveUserMutation.mutateAsync(input);

      toast({
        title: 'Sucesso!',
        description: 'Usuário aprovado e alocado com sucesso.',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Failed to approve user:', error);
      toast({
        title: 'Erro ao aprovar usuário',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (userId: string, reason: string) => {
    try {
      await rejectUserMutation.mutateAsync({ userId, reason });

      toast({
        title: 'Cadastro rejeitado',
        description: 'O usuário foi notificado sobre a rejeição.',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Failed to reject user:', error);
      toast({
        title: 'Erro ao rejeitar cadastro',
        description: error.message || 'Ocorreu um erro inesperado.',
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

  if (isError || !currentCondominiumId) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            {!currentCondominiumId
              ? 'Selecione um condomínio para visualizar cadastros pendentes.'
              : 'Erro ao carregar cadastros pendentes.'}
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
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Aprovação de Cadastros
            </h1>
            <p className="text-sm text-muted-foreground">
              Revise e aprove novos moradores do condomínio
            </p>
          </div>
        </div>

        {pendingUsers.length > 0 && (
          <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">
                {pendingUsers.length} {pendingUsers.length === 1 ? 'pendente' : 'pendentes'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pending Users List */}
      {pendingUsers.length > 0 ? (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <PendingUserCard
              key={user.id}
              user={user}
              onApprove={handleApprove}
              onReject={handleReject}
              isLoading={approveUserMutation.isPending || rejectUserMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <UserCheck className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhum cadastro pendente
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                Todos os cadastros foram processados. Novos cadastros aparecerão aqui automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


