import { memo } from 'react';
import { AlertTriangle, Clock, CheckSquare } from 'lucide-react';
import type { Complaint, Resident, KanbanColumn } from '@/types';
import { ComplaintKanbanColumn } from '../components';

interface AdminComplaintsKanbanPageProps {
  complaints: Complaint[];
  residents: Resident[];
  onDragStart: (e: React.DragEvent, complaint: Complaint) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, newStatus: Complaint['status']) => void;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'open',
    title: 'Aguardando (Fila)',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    id: 'in_progress',
    title: 'Em Análise / Ronda',
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
  },
  {
    id: 'resolved',
    title: 'Finalizado / Notificado',
    icon: CheckSquare,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
];

export const AdminComplaintsKanbanPage = memo(function AdminComplaintsKanbanPage({
  complaints,
  residents,
  onDragStart,
  onDragOver,
  onDrop,
}: AdminComplaintsKanbanPageProps) {
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Gestão de Ocorrências (Kanban)
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Arraste os cartões para atualizar o status. O morador será notificado automaticamente.
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-3 sm:gap-6 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const columnComplaints = complaints.filter((c) => c.status === col.id);

          return (
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
            />
          );
        })}
      </div>
    </div>
  );
});
