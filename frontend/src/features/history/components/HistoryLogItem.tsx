import { Clock, Phone, FileJson } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { Message } from '@/types';
import { formatDateTime } from '@/shared/utils/helpers';

interface HistoryLogItemProps {
  log: Message;
}

const getStatusColor = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'TEXT':
      return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
    case 'TEMPLATE':
      return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
    case 'IMAGE':
      return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
  }
};

export const HistoryLogItem = ({ log }: HistoryLogItemProps) => {
  // Suporta tanto timestamp (compatibilidade) quanto sentAt (padrão)
  const dateField = (log as any).timestamp || (log as any).sentAt || (log as any).createdAt;

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium">
            {formatDateTime(dateField)}
          </span>
        </div>
        <Badge className={getStatusColor(log.type)}>
          {log.type || 'UNKNOWN'}
        </Badge>
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Phone className="h-4 w-4" />
        <span>Destinatário: <span className="text-foreground font-mono">{log.phone || 'N/A'}</span></span>
      </div>

      {/* Payload */}
      {log.payload && (
        <details className="group">
          <summary className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:text-primary/80 select-none">
            <FileJson className="h-4 w-4" />
            <span className="font-medium">Ver Payload</span>
          </summary>
          <div className="mt-3 rounded-md bg-muted/50 p-3 border border-border">
            <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-all overflow-x-auto">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
};

