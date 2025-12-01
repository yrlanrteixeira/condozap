import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from "@/hooks";
import { selectCurrentCondominiumId } from "@/store/slices/condominiumSlice";
import {
  ResidentPageHeader,
  ResidentTable,
  ResidentDialog,
} from "../components";
import { useResidents } from "../hooks/useResidentsApi";
import type { Resident } from "../types";

export function ResidentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | undefined>();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);

  const {
    data: residents,
    isLoading,
    isError,
  } = useResidents(currentCondominiumId || "");

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

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">
              Erro ao carregar moradores
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <ResidentPageHeader onAddResident={handleAddResident} />

      {residents && residents.length > 0 ? (
        <Card className="border-border">
          <CardContent className="p-0">
            <ResidentTable
              residents={residents}
              onEditResident={handleEditResident}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">Nenhum morador cadastrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Adicionar Morador" para começar
              </p>
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

