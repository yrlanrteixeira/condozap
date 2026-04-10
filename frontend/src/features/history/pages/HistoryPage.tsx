import { History, FileText, Send, AlertTriangle, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { PageHeaderSkeleton, ListItemSkeleton } from '@/shared/components/ui/skeleton';
import { useActivityLogs, type ActivityLog } from '../hooks/useHistoryApi';
import { useAuth } from '@/shared/hooks/useAuth';
import { useAppSelector } from '@/shared/hooks';
import { selectCurrentCondominiumId } from '@/shared/store/slices/condominiumSlice';
import { formatDateTime } from '@/shared/utils/helpers';

const activityTypeLabels: Record<string, string> = {
  MESSAGE_SENT: 'Mensagem enviada',
  MESSAGE_FAILED: 'Mensagem falhou',
  COMPLAINT_STATUS_CHANGED: 'Status alterado',
  COMPLAINT_CREATED: 'Ocorrência criada',
  RESIDENT_CREATED: 'Morador criado',
  RESIDENT_UPDATED: 'Morador atualizado',
};

const activityTypeIcons: Record<string, React.ReactNode> = {
  MESSAGE_SENT: <Send className="h-4 w-4 text-success" />,
  MESSAGE_FAILED: <XCircle className="h-4 w-4 text-destructive" />,
  COMPLAINT_STATUS_CHANGED: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  COMPLAINT_CREATED: <AlertTriangle className="h-4 w-4 text-primary" />,
  RESIDENT_CREATED: <UserPlus className="h-4 w-4 text-info" />,
  RESIDENT_UPDATED: <UserPlus className="h-4 w-4 text-info" />,
};

function ActivityLogItem({ log }: { log: ActivityLog }) {
  const icon = activityTypeIcons[log.type] || <History className="h-4 w-4 text-muted-foreground" />;
  const label = activityTypeLabels[log.type] || log.type;
  const isFailed = log.status === 'failed' || log.type === 'MESSAGE_FAILED';

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDateTime(log.createdAt)}</span>
          {isFailed && (
            <Badge variant="destructive" className="text-xs">Falhou</Badge>
          )}
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground mb-2">
        {log.description}
      </div>
      
      {log.userName && (
        <div className="text-xs text-muted-foreground">
          Por: <span className="text-foreground">{log.userName}</span>
        </div>
      )}
      
      {log.errorMessage && (
        <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded p-2">
          Erro: {log.errorMessage}
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const { user } = useAuth();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);

  const condoIdToFetch = user?.role === 'SUPER_ADMIN' ? 'all' : (currentCondominiumId || '');

  const {
    data: logs = [],
    isLoading,
    isError
  } = useActivityLogs(currentCondominiumId || '');

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeaderSkeleton />
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !currentCondominiumId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {!currentCondominiumId
                ? "Selecione um condomínio para visualizar o histórico."
                : "Erro ao carregar o histórico de eventos."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <History className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Histórico</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Registro completo de ações e eventos do sistema
          </p>
        </div>
      </div>

      {logs.length > 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {logs.map((log) => (
                <ActivityLogItem key={log.id} log={log} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                O histórico de ações aparecerá aqui quando houver atividade
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HistoryPage;