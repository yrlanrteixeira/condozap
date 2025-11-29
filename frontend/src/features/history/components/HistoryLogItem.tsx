import type { Message } from '@/types';

interface HistoryLogItemProps {
  log: Message;
}

export const HistoryLogItem = ({ log }: HistoryLogItemProps) => {
  return (
    <div className="mb-3 sm:mb-4 border-b border-border pb-3 sm:pb-4 last:border-0">
      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
        <span className="text-green-400">
          [{new Date(log.timestamp).toLocaleTimeString()}]
        </span>
        <span className="text-blue-400">TO: {log.phone}</span>
        <span className="text-yellow-400">TYPE: {log.type}</span>
      </div>
      <div className="pl-2 sm:pl-4 border-l-2 border-border/50 mb-2 overflow-x-auto">
        <div className="text-foreground font-bold mb-1 text-xs">API Payload:</div>
        <pre className="whitespace-pre-wrap text-muted-foreground break-all">
          {JSON.stringify(log.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
};

