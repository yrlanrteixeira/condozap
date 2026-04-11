import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  className?: string;
}

export function Pagination({
  pagination,
  onPageChange,
  showInfo = true,
  className,
}: PaginationProps) {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);
  
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4",
        className
      )}
    >
      {showInfo && (
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          Mostrando <span className="font-medium">{startItem}</span> -{" "}
          <span className="font-medium">{endItem}</span> de{" "}
          <span className="font-medium">{total}</span> resultados
        </div>
      )}

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 px-2">
          <span className="text-sm">
            Página <span className="font-medium">{page}</span> de{" "}
            <span className="font-medium">{totalPages}</span>
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}