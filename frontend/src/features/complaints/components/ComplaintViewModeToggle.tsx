import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

type ViewMode = 'kanban' | 'table';

interface ComplaintViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ComplaintViewModeToggle = ({
  viewMode,
  onViewModeChange,
}: ComplaintViewModeToggleProps) => {
  return (
    <div className="flex items-center gap-2 bg-muted p-1 rounded-lg w-fit">
      <Button
        variant={viewMode === 'kanban' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('kanban')}
        className="gap-1 sm:gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Kanban</span>
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('table')}
        className="gap-1 sm:gap-2"
      >
        <TableIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Tabela</span>
      </Button>
    </div>
  );
};


