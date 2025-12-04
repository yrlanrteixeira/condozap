import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Complaint, Resident } from '@/types';

interface ComplaintCardProps {
  complaint: Complaint;
  resident?: Resident;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, complaint: Complaint) => void;
}

export const ComplaintCard = ({
  complaint,
  resident,
  draggable = false,
  onDragStart,
}: ComplaintCardProps) => {
  return (
    <Card
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, complaint)}
      className={`${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } hover:shadow-md transition group touch-manipulation`}
      role="button"
      tabIndex={0}
      aria-label={`Ocorrência: ${complaint.content}${
        draggable ? '. Arraste para alterar status.' : ''
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge className="text-[10px] bg-muted text-muted-foreground">
            {complaint.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {new Date(complaint.timestamp).toLocaleDateString()}
          </span>
        </div>
        <p className="text-foreground text-sm mb-3 font-medium">{complaint.content}</p>
        <div className="text-xs text-muted-foreground">
          {resident ? `Unid. ${resident.unit} (${resident.tower})` : 'Anônimo'}
        </div>

        {draggable && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2 border-t pt-2 border-border">
            <ArrowRight size={12} />
            Arraste para mover
          </div>
        )}
      </CardContent>
    </Card>
  );
};


