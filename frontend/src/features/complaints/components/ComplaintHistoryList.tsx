import { History, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Complaint, ComplaintStatus } from '@/types';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';

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
          <div className="text-center py-10 bg-muted/50 rounded-lg border border-dashed border-border">
            <p className="text-muted-foreground italic">Nenhum registro encontrado.</p>
          </div>
        )}

        {complaints.map((complaint) => (
          <Card key={complaint.id} className="hover:shadow-md transition">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {complaint.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(complaint.timestamp).toLocaleDateString()} às{' '}
                    {new Date(complaint.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-foreground font-medium">{complaint.content}</p>
              </div>

              <ComplaintStatusBadge status={complaint.status as ComplaintStatus} size="sm" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};


