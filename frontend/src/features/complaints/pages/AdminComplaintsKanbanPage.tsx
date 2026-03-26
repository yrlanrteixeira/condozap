import { memo, useMemo } from 'react';
import { AlertTriangle, Clock, CheckSquare } from 'lucide-react';
import type { Complaint } from '@/features/complaints/types';
import type { Resident } from '@/features/residents/types';
import { useIsMobile } from '@/shared/hooks/useMediaQuery';
import { ComplaintKanbanColumn } from '../components';

type KanbanColumn = {
  id: Complaint['status'];
  title: string;
  icon: typeof AlertTriangle;
  color: string;
  bg?: string;
};

interface AdminComplaintsKanbanPageProps {
  complaints: Complaint[];
  residents: Resident[];
  onDragStart: (e: React.DragEvent, complaint: Complaint) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, newStatus: Complaint['status']) => void;
  onComplaintClick?: (complaint: Complaint) => void;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'TRIAGE',
    title: 'Triagem',
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    id: 'IN_PROGRESS',
    title: 'Em atendimento',
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    id: 'WAITING_USER',
    title: 'Aguardando usuário',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    id: 'WAITING_THIRD_PARTY',
    title: 'Aguardando terceiro',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    id: 'RESOLVED',
    title: 'Resolvido',
    icon: CheckSquare,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/20',
  },
  {
    id: 'CLOSED',
    title: 'Encerrado',
    icon: CheckSquare,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    id: 'CANCELLED',
    title: 'Cancelado',
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
];

export const AdminComplaintsKanbanPage = memo(function AdminComplaintsKanbanPage({
  complaints,
  residents,
  onDragStart,
  onDragOver,
  onDrop,
  onComplaintClick,
}: AdminComplaintsKanbanPageProps) {
  const isMobile = useIsMobile();

  const complaintsPerColumn = useMemo(
    () =>
      COLUMNS.map((col) => ({
        col,
        columnComplaints: complaints.filter((c) =>
          col.id === 'TRIAGE'
            ? c.status === 'TRIAGE' || c.status === 'NEW'
            : c.status === col.id
        ),
      })),
    [complaints]
  );

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Gestão de Ocorrências (Kanban)
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {isMobile
              ? 'Toque em "Detalhes" para gerenciar. O morador será notificado automaticamente.'
              : 'Arraste os cartões para atualizar o status. O morador será notificado automaticamente.'}
          </p>
        </div>
      </div>

      {isMobile ? (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pb-4">
          {complaintsPerColumn.map(({ col, columnComplaints }) => (
            <ComplaintKanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              icon={col.icon}
              color={col.color}
              complaints={columnComplaints}
              residents={residents}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onComplaintClick={onComplaintClick}
              isMobile
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex gap-3 sm:gap-6 overflow-x-auto pb-4">
          {complaintsPerColumn.map(({ col, columnComplaints }) => (
            <ComplaintKanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              icon={col.icon}
              color={col.color}
              complaints={columnComplaints}
              residents={residents}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onComplaintClick={onComplaintClick}
            />
          ))}
        </div>
      )}
    </div>
  );
});
