import { Card, CardContent } from '@/components/ui/card';
import type { Message } from '@/types';
import { HistoryLogItem } from './HistoryLogItem';

interface HistoryLogListProps {
  logs: Message[];
}

export const HistoryLogList = ({ logs }: HistoryLogListProps) => {
  return (
    <Card className="bg-secondary">
      <CardContent className="p-4 sm:p-6 font-mono text-[10px] sm:text-xs text-secondary-foreground overflow-x-auto">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          logs
            .slice()
            .reverse()
            .map((log) => <HistoryLogItem key={log.id} log={log} />)
        )}
      </CardContent>
    </Card>
  );
};

