import { memo } from 'react';
import { AlertTriangle, Clock, CheckSquare } from 'lucide-react';
import type { Complaint } from '@/features/complaints/types';
import type { Resident } from '@/features/residents/types';
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
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'TRIAGE',
    title: 'Triagem',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    id: 'IN_PROGRESS',
    title: 'Em atendimento',
    icon: Clock,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    id: 'WAITING_USER',
    title: 'Aguardando usuário',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    id: 'WAITING_THIRD_PARTY',
    title: 'Aguardando terceiro',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    id: 'RESOLVED',
    title: 'Resolvido',
    icon: CheckSquare,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    id: 'CLOSED',
    title: 'Encerrado',
    icon: CheckSquare,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    id: 'CANCELLED',
    title: 'Cancelado',
    icon: AlertTriangle,
    color: 'text-gray-500',
    bg: 'bg-gray-50',
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
          const columnComplaints = complaints.filter((c) =>
            col.id === 'TRIAGE'
              ? c.status === 'TRIAGE' || c.status === 'NEW'
              : c.status === col.id
          );

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
