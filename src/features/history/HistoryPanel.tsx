import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Message } from '@/types'

interface HistoryPanelProps {
  messageLog: Message[]
}

export function HistoryPanel({ messageLog }: HistoryPanelProps) {
  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 sm:mb-6">Logs de Sistema</h2>
      <Card className="bg-slate-900">
        <CardContent className="p-4 sm:p-6 font-mono text-[10px] sm:text-xs text-slate-300 overflow-x-auto">
          {messageLog.length === 0 && (
            <p className="text-slate-500">Nenhum registro ainda.</p>
          )}
          {messageLog
            .slice()
            .reverse()
            .map((log) => (
              <div
                key={log.id}
                className="mb-3 sm:mb-4 border-b border-slate-800 pb-3 sm:pb-4 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                  <span className="text-green-400">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="text-blue-400">TO: {log.phone}</span>
                  <span className="text-yellow-400">TYPE: {log.type}</span>
                </div>
                <div className="pl-2 sm:pl-4 border-l-2 border-slate-700 mb-2 overflow-x-auto">
                  <div className="text-white font-bold mb-1 text-xs">API Payload:</div>
                  <pre className="whitespace-pre-wrap text-slate-400 break-all">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
