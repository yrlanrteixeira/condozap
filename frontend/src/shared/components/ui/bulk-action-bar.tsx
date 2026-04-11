import { useState } from "react";
import { CheckSquare, Square, ChevronDown } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { cn } from "@/lib/utils";

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (ids: string[]) => void;
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedIds: string[];
  totalCount: number;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionBar({
  selectedIds,
  totalCount,
  actions,
  className,
}: BulkActionBarProps) {
  const [open, setOpen] = useState(false);

  if (selectedIds.length === 0) return null;

  const allSelected = selectedIds.length === totalCount;
  const selectedCount = selectedIds.length;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3",
        "bg-card border border-border rounded-lg shadow-lg px-4 py-3",
        "animate-in slide-in-from-bottom-2 fade-in",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">
          {selectedCount} item{selectedCount !== 1 ? "s" : ""} selecionado
          {allSelected && ` de ${totalCount}`}
        </span>
      </div>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Ações
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => action.onClick(selectedIds)}
              disabled={action.disabled}
              className="cursor-pointer"
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => window.location.reload()}
            className="text-muted-foreground cursor-pointer"
          >
            Limpar seleção
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface BulkSelectCheckboxProps {
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  className?: string;
}

export function BulkSelectCheckbox({
  allSelected,
  someSelected,
  onToggleAll,
  className,
}: BulkSelectCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onToggleAll}
      className={cn(
        "p-1 rounded hover:bg-muted transition-colors",
        className
      )}
      aria-label={allSelected ? "Desmarcar todos" : "Selecionar todos"}
    >
      {allSelected || someSelected ? (
        <CheckSquare className="h-5 w-5 text-primary" />
      ) : (
        <Square className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}