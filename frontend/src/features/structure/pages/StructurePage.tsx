import { useState, useMemo } from "react";
import { Loader2, PlusCircle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaginationTable } from "@/components/ui/pagination-table";
import type { Resident } from "@/features/residents/types";
import { useAppSelector } from "@/hooks";
import { selectCurrentCondominiumId } from "@/store/slices/condominiumSlice";
import { useResidents } from "@/features/residents/hooks/useResidentsApi";
import {
  ResidentTable,
  ResidentDialog,
} from "@/features/residents";

export function StructurePage() {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | undefined>();
  const itemsPerPage = 10;

  const {
    data: residents,
    isLoading,
    isError,
  } = useResidents(currentCondominiumId || "", {});

  const paginatedResidents = useMemo(() => {
    if (!residents) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return residents.slice(startIndex, endIndex);
  }, [residents, currentPage]);

  const totalPages = Math.ceil((residents?.length || 0) / itemsPerPage);

  const handleAddResident = () => {
    setSelectedResident(undefined);
    setIsDialogOpen(true);
  };

  const handleEditResident = (resident: Resident) => {
    setSelectedResident(resident);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedResident(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !currentCondominiumId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {!currentCondominiumId
                ? "Selecione um condomínio para visualizar a estrutura."
                : "Erro ao carregar moradores."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Estrutura do Condomínio</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Visualize e gerencie torres, andares e unidades
            </p>
          </div>
        </div>
        <Button onClick={handleAddResident} className="shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Unidade
        </Button>
      </div>

      {residents && residents.length > 0 ? (
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-lg">
              <ResidentTable residents={paginatedResidents} onEdit={handleEditResident} />
            </div>

            {residents.length > itemsPerPage && (
              <div className="p-4 border-t border-border bg-muted/20">
                <PaginationTable
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={residents.length}
                  showInfo={true}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">Nenhuma unidade cadastrada</p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Comece adicionando moradores e suas unidades
              </p>
              <Button onClick={handleAddResident} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Primeira Unidade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ResidentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        resident={selectedResident}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
