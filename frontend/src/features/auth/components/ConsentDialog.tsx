import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Shield, MessageCircle, Database, CheckCircle } from "lucide-react";

interface ConsentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  type: "whatsapp" | "data";
  onAccept: () => void;
}

export function ConsentDialog({
  isOpen,
  onOpenChange,
  type,
  onAccept,
}: ConsentDialogProps) {
  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  if (type === "whatsapp") {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Consentimento para Notificações WhatsApp
            </DialogTitle>
            <DialogDescription>
              Entenda como usaremos o WhatsApp para comunicação
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  O que você receberá:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-300">
                  <li>Atualizações sobre suas ocorrências/denúncias</li>
                  <li>Notificações de mudança de status</li>
                  <li>Comentários do síndico/administrador</li>
                  <li>Comunicados importantes do condomínio</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Como funciona:</h4>
                <p>
                  Ao aceitar, você autoriza o TalkZap a enviar mensagens para o
                  número de WhatsApp cadastrado. As mensagens são enviadas
                  automaticamente quando há atualizações relevantes sobre suas
                  solicitações ou comunicados do condomínio.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Seus direitos:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Você pode revogar este consentimento a qualquer momento</li>
                  <li>Não enviamos spam ou publicidade</li>
                  <li>Seu número não é compartilhado com terceiros</li>
                </ul>
              </div>

              <div className="bg-muted p-3 rounded-lg text-xs">
                <strong>Base Legal (LGPD):</strong> Art. 7º, I - Consentimento do
                titular. Você pode solicitar a revogação enviando um email para
                suporte@talkzap.com.
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
              Aceitar e Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Consentimento para Tratamento de Dados
          </DialogTitle>
          <DialogDescription>
            Política de Privacidade e Termos de Uso (LGPD)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Dados que coletamos:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                <li>Nome completo e email</li>
                <li>Número de telefone</li>
                <li>Dados da unidade (torre, andar, apartamento)</li>
                <li>Ocorrências e mensagens enviadas</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">
                Finalidade do tratamento:
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Identificação e autenticação no sistema</li>
                <li>Gestão de ocorrências e solicitações</li>
                <li>Comunicação entre moradores e administração</li>
                <li>Melhoria dos serviços prestados</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Seus direitos (LGPD):</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Acesso aos seus dados pessoais</li>
                <li>Correção de dados incompletos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação de dados</li>
                <li>Portabilidade dos dados</li>
                <li>Revogação do consentimento</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Segurança:</h4>
              <p>
                Seus dados são armazenados de forma segura e criptografada. Apenas
                pessoas autorizadas (síndico e administradores do condomínio) têm
                acesso às informações necessárias para gestão.
              </p>
            </div>

            <div className="bg-muted p-3 rounded-lg text-xs">
              <strong>Base Legal (LGPD):</strong> Art. 7º, I - Consentimento do
              titular. Para exercer seus direitos, entre em contato:
              privacidade@talkzap.com
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAccept}>Aceitar e Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConsentDialog;

