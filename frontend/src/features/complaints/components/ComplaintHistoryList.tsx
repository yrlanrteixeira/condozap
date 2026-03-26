import { History, Clock, FileText, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import type { Complaint, ComplaintStatus } from '@/features/complaints/types';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';

const ACTION_COMMENT = 'COMMENT';

function getLastAdminComment(complaint: Complaint): string | null {
  const history = complaint.statusHistory ?? [];
  const commentEntry = history.find((e) => e.action === ACTION_COMMENT && e.notes);
  return commentEntry?.notes ?? null;
}

interface ComplaintHistoryListProps {
  complaints: Complaint[];
}

export const ComplaintHistoryList = ({ complaints }: ComplaintHistoryListProps) => {
  return (
    <div>
      <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-foreground flex items-center gap-2">
        <History size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
        Meus Relatos
      </h3>

      <div className="space-y-2 sm:space-y-3">
        {complaints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 bg-muted/50 rounded-lg border border-dashed border-border">
            <div className="p-3 rounded-full bg-background mb-3">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhum relato ainda</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">
              Suas denúncias aparecerão aqui após o envio
            </p>
          </div>
        )}

        {complaints.map((complaint) => {
          const dateStr = complaint.timestamp ?? complaint.createdAt;
          const lastComment = getLastAdminComment(complaint);
          return (
            <Card key={complaint.id} className="hover:shadow-md transition">
              <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs uppercase">
                      {complaint.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} />
                      {dateStr
                        ? `${new Date(dateStr).toLocaleDateString()} às ${new Date(dateStr).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : '-'}
                    </span>
                  </div>
                  <p className="text-foreground font-medium">{complaint.content}</p>
                  {complaint.sector && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Setor: {complaint.sector.name}
                    </p>
                  )}
                  {(complaint.responseDueAt || complaint.resolutionDueAt) && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      {complaint.responseDueAt && (
                        <div>Resposta até: {new Date(complaint.responseDueAt).toLocaleString('pt-BR')}</div>
                      )}
                      {complaint.resolutionDueAt && (
                        <div>Resolução prevista: {new Date(complaint.resolutionDueAt).toLocaleString('pt-BR')}</div>
                      )}
                    </div>
                  )}
                  {lastComment && (
                    <div className="mt-2 flex gap-2 rounded-md bg-primary/5 border border-primary/20 p-2 text-xs">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                      <div>
                        <span className="font-medium text-foreground">O que está sendo realizado: </span>
                        <span className="text-muted-foreground">{lastComment}</span>
                      </div>
                    </div>
                  )}
                </div>

                <ComplaintStatusBadge status={complaint.status as ComplaintStatus} size="sm" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};


