import { X, Filter } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface FilterChip {
  id: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export function FilterChips({
  filters,
  onRemove,
  onClearAll,
  className,
}: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filtros:</span>
      </div>
      
      {filters.map((filter) => (
        <Badge
          key={filter.id}
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 h-auto"
        >
          <span className="text-xs">{filter.label}:</span>
          <span className="font-medium">{filter.value}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => onRemove(filter.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      
      {onClearAll && filters.length > 1 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-auto p-1"
          onClick={onClearAll}
        >
          Limpar todos
        </Button>
      )}
    </div>
  );
}