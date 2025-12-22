import { LucideIcon, Inbox } from 'lucide-react';
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
}: ComplaintKanbanColumnProps) => {
  return (
    <div
      className="flex-1 min-w-[280px] sm:min-w-[300px] bg-muted/50 rounded-xl flex flex-col max-h-full"
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
          const resident = residents.find((r) => r.id === complaint.residentId);
          return (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              resident={resident}
              draggable
              onDragStart={onDragStart}
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


