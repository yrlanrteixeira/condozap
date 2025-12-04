/**
 * Pending Approval Page
 * 
 * Página exibida para usuários que estão aguardando aprovação do síndico/admin
 */

import { useEffect } from 'react';
import { Clock, Home, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface UserStatus {
  id: string;
  name: string;
  email: string;
  status: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  requestedTower: string | null;
  requestedFloor: string | null;
  requestedUnit: string | null;
}

export function PendingApprovalPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Check user status periodically
  const { data: userStatus, refetch } = useQuery<UserStatus>({
    queryKey: ['userStatus'],
    queryFn: async () => {
      const { data } = await api.get('/users/my-status');
      return data;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Redirect if approved
  useEffect(() => {
    if (userStatus?.status === 'APPROVED') {
      navigate('/dashboard');
    }
  }, [userStatus, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const handleRefresh = () => {
    refetch();
  };

  // Rejection case
  if (userStatus?.status === 'REJECTED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-2xl border-red-200 dark:border-red-900">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-6 p-4 rounded-full bg-red-100 dark:bg-red-950/30 w-fit">
              <Clock className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">
              Cadastro Rejeitado
            </CardTitle>
            <CardDescription className="text-lg">
              Infelizmente, seu cadastro não foi aprovado
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {userStatus.rejectionReason && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <p className="font-semibold text-red-900 dark:text-red-200 mb-2">
                  Motivo:
                </p>
                <p className="text-red-800 dark:text-red-300">
                  {userStatus.rejectionReason}
                </p>
              </div>
            )}

            <div className="text-center text-muted-foreground">
              <p>
                Entre em contato com a administração do condomínio para mais informações.
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <Button onClick={handleLogout} variant="outline" size="lg">
                Fazer Login com Outra Conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending case
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-2xl border-border">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 w-fit animate-pulse">
            <Clock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground mb-2">
            Aguardando Aprovação
          </CardTitle>
          <CardDescription className="text-lg">
            Seu cadastro está em análise pelo síndico ou administrador do condomínio
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {/* User Info */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">
                    Informações do Cadastro
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><span className="font-medium">Nome:</span> {userStatus?.name}</p>
                    <p><span className="font-medium">Email:</span> {userStatus?.email}</p>
                    {userStatus?.requestedTower && (
                      <p>
                        <span className="font-medium">Unidade solicitada:</span>{' '}
                        Torre {userStatus.requestedTower} - Andar {userStatus.requestedFloor} - Apto {userStatus.requestedUnit}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Cadastro realizado</p>
                  <p className="text-sm text-muted-foreground">Seus dados foram enviados com sucesso</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white animate-pulse flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Análise em andamento</p>
                  <p className="text-sm text-muted-foreground">
                    O síndico ou administrador está verificando suas informações
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 opacity-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-foreground">Aprovação</p>
                  <p className="text-sm text-muted-foreground">
                    Você receberá acesso ao sistema após a aprovação
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <div className="text-center text-muted-foreground mb-4">
              <p className="text-sm">
                Este processo geralmente leva de 24 a 48 horas. 
                Você receberá um email quando seu cadastro for aprovado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleRefresh} variant="outline" size="lg">
                <Clock className="mr-2 h-4 w-4" />
                Verificar Status
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="lg">
                Sair
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


