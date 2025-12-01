import { History, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { HistoryHeader, HistoryLogList } from '../components';

// TODO: Fetch history from API
const mockLogs: any[] = [];

export function HistoryPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
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

      {mockLogs.length > 0 ? (
        <HistoryLogList logs={mockLogs} />
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
