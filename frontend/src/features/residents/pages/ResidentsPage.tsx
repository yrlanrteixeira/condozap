import { useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeaderSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();

  // SUPER_ADMIN vê todos os moradores, outros veem apenas do condomínio selecionado
  const condoIdToFetch = user?.role === 'SUPER_ADMIN' ? 'all' : (currentCondominiumId || '');

  const {
    data: residents,
    isLoading,
    isError,
  } = useResidents(condoIdToFetch);

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
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeaderSkeleton />
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
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
              onEdit={handleEditResident}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhum morador cadastrado
              </p>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Comece adicionando moradores para gerenciar unidades e enviar mensagens
              </p>
              <Button onClick={handleAddResident} variant="outline">
                Adicionar Primeiro Morador
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

