import { useMemo, useState } from 'react';
import { LucideIcon, Inbox, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Complaint } from '@/features/complaints/types';
import type { Resident } from '@/features/residents/types';
import { ComplaintCard } from './ComplaintCard';

interface ComplaintKanbanColumnProps {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  complaints: Complaint[];
  residents: Resident[];
  onDragStart: (e: React.DragEvent, complaint: Complaint) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: Complaint['status']) => void;
  onComplaintClick?: (complaint: Complaint) => void;
  isMobile?: boolean;
}

export const ComplaintKanbanColumn = ({
  id,
  title,
  icon: Icon,
  color,
  complaints,
  residents,
  onDragStart,
  onDragOver,
  onDrop,
  onComplaintClick,
  isMobile = false,
}: ComplaintKanbanColumnProps) => {
  const [isExpanded, setIsExpanded] = useState(() =>
    isMobile ? complaints.length > 0 : true
  );

  const residentMap = useMemo(
    () => new Map(residents.map((r) => [r.id, r])),
    [residents]
  );

  // Mobile: vertically stacked collapsible sections
  if (isMobile) {
    return (
      <div className="w-full bg-muted/50 rounded-xl flex flex-col">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={cn(
            'p-3 border-b border-border flex items-center gap-2 font-bold bg-card rounded-t-xl text-sm w-full text-left touch-manipulation',
            !isExpanded && 'rounded-b-xl border-b-0',
            color
          )}
        >
          {isExpanded ? (
            <ChevronDown size={16} className="shrink-0" />
          ) : (
            <ChevronRight size={16} className="shrink-0" />
          )}
          <Icon size={16} className="shrink-0" />
          <span className="truncate">{title}</span>
          <Badge variant="secondary" className="ml-auto">
            {complaints.length}
          </Badge>
        </button>

        {isExpanded && (
          <div className="p-2 space-y-2">
            {complaints.map((complaint) => {
              const resident = residentMap.get(complaint.residentId);
              return (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  resident={resident}
                  onComplaintClick={onComplaintClick}
                />
              );
            })}

            {complaints.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-lg bg-background/50">
                <Inbox className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Nenhuma ocorrência</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop: horizontal kanban column with drag-and-drop
  return (
    <div
      className="flex-1 w-full md:min-w-[280px] md:max-w-[320px] bg-muted/50 rounded-xl flex flex-col max-h-full"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, id as Complaint['status'])}
    >
      <div
        className={cn(
          'p-3 sm:p-4 border-b border-border flex items-center gap-2 font-bold bg-card rounded-t-xl text-sm sm:text-base',
          color
        )}
      >
        <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
        <span className="truncate">{title}</span>
        <Badge variant="secondary" className="ml-auto">
          {complaints.length}
        </Badge>
      </div>

      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 overflow-y-auto flex-1">
        {complaints.map((complaint) => {
          const resident = residentMap.get(complaint.residentId);
          return (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              resident={resident}
              draggable
              onDragStart={onDragStart}
              onComplaintClick={onComplaintClick}
            />
          );
        })}

        {complaints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg bg-background/50">
            <Inbox className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Nenhuma ocorrência</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Arraste cartões para cá
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


