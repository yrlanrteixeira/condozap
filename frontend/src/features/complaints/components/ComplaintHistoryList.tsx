import { History, Clock, FileText, MessageSquare, ChevronRight, Star } from 'lucide-react';
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

function getCommentCount(complaint: Complaint): number {
  const history = complaint.statusHistory ?? [];
  return history.filter((e) => e.action === ACTION_COMMENT).length;
}

const WORKFLOW_STEPS = ["TRIAGE", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];

function ComplaintProgressBar({ status }: { status: string }) {
  const currentIndex = WORKFLOW_STEPS.indexOf(status);
  const progress = currentIndex >= 0
    ? Math.round(((currentIndex + 1) / WORKFLOW_STEPS.length) * 100)
    : 10;
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

interface ComplaintHistoryListProps {
  complaints: Complaint[];
  onComplaintClick?: (complaint: Complaint) => void;
}

export const ComplaintHistoryList = ({ complaints, onComplaintClick }: ComplaintHistoryListProps) => {
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
              Suas denuncias aparecerao aqui apos o envio
            </p>
          </div>
        )}

        {complaints.map((complaint) => {
          const dateStr = complaint.timestamp ?? complaint.createdAt;
          const lastComment = getLastAdminComment(complaint);
          const commentCount = getCommentCount(complaint);
          const totalUpdates = (complaint.statusHistory ?? []).length;

          return (
            <Card
              key={complaint.id}
              className={`hover:shadow-md transition ${onComplaintClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
              onClick={() => onComplaintClick?.(complaint)}
            >
              <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs uppercase">
                      {complaint.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} />
                      {dateStr
                        ? `${new Date(dateStr).toLocaleDateString()} as ${new Date(dateStr).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : '-'}
                    </span>
                  </div>
                  <p className="text-foreground font-medium line-clamp-2">{complaint.content}</p>
                  {complaint.sector && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Setor: {complaint.sector.name}
                    </p>
                  )}
                  {(complaint.responseDueAt || complaint.resolutionDueAt) && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      {complaint.responseDueAt && (
                        <div>Resposta ate: {new Date(complaint.responseDueAt).toLocaleString('pt-BR')}</div>
                      )}
                      {complaint.resolutionDueAt && (
                        <div>Resolucao prevista: {new Date(complaint.resolutionDueAt).toLocaleString('pt-BR')}</div>
                      )}
                    </div>
                  )}
                  {lastComment && (
                    <div className="mt-2 flex gap-2 rounded-md bg-primary/5 border border-primary/20 p-2 text-xs">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">O que esta sendo realizado: </span>
                        <span className="text-muted-foreground line-clamp-2">{lastComment}</span>
                      </div>
                    </div>
                  )}
                  {totalUpdates > 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {totalUpdates} {totalUpdates === 1 ? 'atualizacao' : 'atualizacoes'}
                      {commentCount > 0 && ` (${commentCount} ${commentCount === 1 ? 'comentario' : 'comentarios'})`}
                    </p>
                  )}

                  <div className="mt-2 space-y-1">
                    <ComplaintProgressBar status={complaint.status} />
                    {complaint.status === "RESOLVED" && !complaint.csatScore && (
                      <span className="inline-flex items-center gap-1 text-amber-500 text-xs font-medium">
                        <Star className="h-3 w-3 fill-amber-500" />
                        Avaliar
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <ComplaintStatusBadge status={complaint.status as ComplaintStatus} size="sm" />
                  {onComplaintClick && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};


