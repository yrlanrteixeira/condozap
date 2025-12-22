import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/shared/components/ui/pagination";

interface PaginationTableProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  showInfo?: boolean;
  className?: string;
}

const getPageNumbers = (
  currentPage: number,
  totalPages: number
): (number | string)[] => {
  const pages: (number | string)[] = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    // Se tiver poucas páginas, mostra todas
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Mostra primeira página
    pages.push(1);

    // Calcula range de páginas ao redor da página atual
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Ajusta o range se estiver muito no início ou fim
    if (currentPage <= 3) {
      endPage = Math.min(4, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(totalPages - 3, 2);
    }

    // Adiciona ellipsis se necessário
    if (startPage > 2) {
      pages.push("...");
    }

    // Adiciona páginas do meio
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Adiciona ellipsis se necessário
    if (endPage < totalPages - 1) {
      pages.push("...");
    }

    // Mostra última página
    pages.push(totalPages);
  }

  return pages;
};

export function PaginationTable({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  showInfo = true,
  className,
}: PaginationTableProps) {
  const pages = getPageNumbers(currentPage, totalPages);

  const getInfoText = () => {
    if (totalPages > 1) {
      return `Página ${currentPage} de ${totalPages}`;
    }
    if (totalItems !== undefined) {
      return `${totalItems} ${totalItems === 1 ? "registro" : "registros"}`;
    }
    return null;
  };

  return (
    <div
      className={cn(
        "mt-6 flex flex-col items-center justify-end gap-4 sm:flex-row",
        className
      )}
    >
      {/* Info de registros */}
      {showInfo && getInfoText() && (
        <div className="text-sm text-muted-foreground sm:mr-auto">
          <span className="font-medium">{getInfoText()}</span>
        </div>
      )}

      {/* Controles de navegação - só mostrar se tiver mais de 1 página */}
      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            {/* Primeira página */}
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title="Primeira página"
                aria-label="Ir para a primeira página"
                className="h-8 w-8"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>

            {/* Página anterior */}
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Página anterior"
                aria-label="Ir para a página anterior"
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>

            {/* Números de página */}
            {pages.map((page, index) => {
              if (page === "...") {
                return (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <span
                      className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                      aria-hidden="true"
                    >
                      ...
                    </span>
                  </PaginationItem>
                );
              }

              const pageNumber = page as number;
              const isActive = pageNumber === currentPage;

              return (
                <PaginationItem key={pageNumber}>
                  <Button
                    variant={isActive ? "default" : "outline"}
                    size="icon"
                    onClick={() => onPageChange(pageNumber)}
                    className="h-8 w-8"
                    title={`Página ${pageNumber}`}
                    aria-label={`Ir para a página ${pageNumber}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {pageNumber}
                  </Button>
                </PaginationItem>
              );
            })}

            {/* Próxima página */}
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Próxima página"
                aria-label="Ir para a próxima página"
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>

            {/* Última página */}
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Última página"
                aria-label="Ir para a última página"
                className="h-8 w-8"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
