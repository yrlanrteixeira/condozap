import { ArrowRight, FileText } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import type { Complaint } from '@/features/complaints/types';
import type { Resident } from '@/features/residents/types';
import { formatDate, formatDateTime } from '@/shared/utils/helpers';

interface ComplaintCardProps {
  complaint: Complaint;
  resident?: Resident;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, complaint: Complaint) => void;
  onComplaintClick?: (complaint: Complaint) => void;
}

export const ComplaintCard = ({
  complaint,
  resident,
  draggable = false,
  onDragStart,
  onComplaintClick,
}: ComplaintCardProps) => {
  // Suporta tanto timestamp (compatibilidade) quanto createdAt (padrão)
  const dateField = complaint.timestamp || complaint.createdAt;

  return (
    <Card
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, complaint)}
      className={`${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } hover:shadow-md transition-all group touch-manipulation border-border/50 bg-card`}
      role="button"
      tabIndex={0}
      aria-label={`Ocorrência: ${complaint.content}${
        draggable ? '. Arraste para alterar status.' : ''
      }`}
    >
      <CardContent className="p-3 sm:p-3.5">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="text-[10px] sm:text-xs bg-secondary/80 hover:bg-secondary text-secondary-foreground font-medium border-transparent">
              {complaint.category}
            </Badge>
            {complaint.sector && (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-background">
                {complaint.sector.name}
              </Badge>
            )}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap pt-0.5">
            {formatDate(dateField)}
          </span>
        </div>
        <p className="text-foreground text-xs sm:text-sm mb-3 font-medium line-clamp-3 whitespace-pre-wrap leading-relaxed">
          {complaint.content}
        </p>
        <div className="text-[11px] sm:text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded inline-flex items-center">
          {resident ? `Unid. ${resident.unit} (${resident.tower})` : 'Anônimo'}
        </div>

        {(complaint.responseDueAt || complaint.resolutionDueAt) && (
          <div className="mt-3 bg-muted/30 rounded-md p-2 text-[10px] sm:text-[11px] text-muted-foreground space-y-1.5 border border-border/50">
            {complaint.responseDueAt && (
              <div className="flex items-center justify-between">
                <span className="font-medium">SLA resposta</span>
                <span className="text-foreground font-medium">{formatDateTime(complaint.responseDueAt)}</span>
              </div>
            )}
            {complaint.resolutionDueAt && (
              <div className="flex items-center justify-between">
                <span className="font-medium">SLA resolução</span>
                <span className="text-foreground font-medium">{formatDateTime(complaint.resolutionDueAt)}</span>
              </div>
            )}
          </div>
        )}

        {(draggable || onComplaintClick) && (
          <div className="text-xs text-muted-foreground flex items-center justify-between gap-2 opacity-70 hover:opacity-100 transition-opacity mt-2 border-t pt-2 border-border">
            {draggable && (
              <span className="flex items-center gap-1">
                <ArrowRight size={14} />
                Arraste para mover
              </span>
            )}
            {onComplaintClick && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplaintClick(complaint);
                }}
              >
                <FileText size={14} className="mr-1" />
                Detalhes
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


