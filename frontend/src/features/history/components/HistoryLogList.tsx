import { Card, CardContent } from '@/shared/components/ui/card';
import type { HistoryLog } from '../types';
import { HistoryLogItem } from './HistoryLogItem';

interface HistoryLogListProps {
  logs: HistoryLog[];
}

export const HistoryLogList = ({ logs }: HistoryLogListProps) => {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro encontrado.
            </p>
          ) : (
            logs
              .slice()
              .reverse()
              .map((log) => <HistoryLogItem key={log.id} log={log} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
};

