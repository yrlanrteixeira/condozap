/**
 * WhatsApp Connection Status Component
 * 
 * Exibe o status da conexão com WhatsApp e permite conectar via QR Code
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Loader2, Wifi, WifiOff, RefreshCw, QrCode, LogOut, Smartphone } from 'lucide-react';
import { useEvolutionStatus, useEvolutionQRCode, useEvolutionDisconnect, useEvolutionRestart } from '../hooks/useEvolutionApi';
import { useToast } from '@/shared/components/ui/use-toast';

export function WhatsAppConnectionStatus() {
  const [showQRDialog, setShowQRDialog] = useState(false);
  const { toast } = useToast();

  const { data: status, isLoading: isLoadingStatus, refetch: refetchStatus } = useEvolutionStatus();
  const { data: qrcode, isLoading: isLoadingQR } = useEvolutionQRCode(showQRDialog && !status?.connected);
  const disconnectMutation = useEvolutionDisconnect();
  const restartMutation = useEvolutionRestart();

  const isConnected = status?.connected;
  const isConnecting = status?.state === 'connecting';

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast({
        title: 'Desconectado',
        description: 'WhatsApp foi desconectado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao desconectar.',
        variant: 'destructive',
      });
    }
  };

  const handleRestart = async () => {
    try {
      await restartMutation.mutateAsync();
      toast({
        title: 'Reiniciado',
        description: 'Instância reiniciada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao reiniciar.',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingStatus) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">WhatsApp</CardTitle>
              <CardDescription>Conexão via Evolution API</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : isConnecting ? 'secondary' : 'destructive'}>
            {isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isConnected ? (
          // Estado conectado
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Smartphone className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-foreground">WhatsApp conectado</p>
                <p className="text-sm text-muted-foreground">
                  Instância: {status?.instanceName}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStatus()}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                disabled={restartMutation.isPending}
                className="flex-1"
              >
                {restartMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Reiniciar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          // Estado desconectado
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <WifiOff className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <p className="font-medium text-foreground">WhatsApp desconectado</p>
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code para conectar
                </p>
              </div>
            </div>

            <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Conectar WhatsApp
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Conectar WhatsApp</DialogTitle>
                  <DialogDescription>
                    Escaneie o QR Code abaixo com seu WhatsApp para conectar
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-6">
                  {isLoadingQR ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                    </div>
                  ) : qrcode?.qrcode ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg">
                        <img
                          src={`data:image/png;base64,${qrcode.qrcode}`}
                          alt="QR Code WhatsApp"
                          className="w-64 h-64"
                        />
                      </div>
                      {qrcode.pairingCode && (
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Ou use o código:</p>
                          <code className="text-lg font-mono font-bold text-primary">
                            {qrcode.pairingCode}
                          </code>
                        </div>
                      )}
                      <p className="text-xs text-center text-muted-foreground">
                        O QR Code atualiza automaticamente a cada 20 segundos
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-muted-foreground">
                        Não foi possível gerar o QR Code.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchStatus()}
                        className="mt-4"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-center text-sm text-muted-foreground border-t border-border pt-4">
                  <p>1. Abra o WhatsApp no seu celular</p>
                  <p>2. Vá em <strong>Dispositivos conectados</strong></p>
                  <p>3. Toque em <strong>Conectar dispositivo</strong></p>
                  <p>4. Escaneie este QR Code</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

