import type { Message } from '@/types';
import { HistoryHeader, HistoryLogList } from '../components';

interface HistoryPageProps {
  messageLog: Message[];
}

export function HistoryPage({ messageLog }: HistoryPageProps) {
  return (
    <div className="p-4 sm:p-6">
      <HistoryHeader
        title="Logs de Sistema"
        description="Histórico de todas as mensagens enviadas pelo sistema"
      />
      <HistoryLogList logs={messageLog} />
    </div>
  );
}

export default HistoryPage;
