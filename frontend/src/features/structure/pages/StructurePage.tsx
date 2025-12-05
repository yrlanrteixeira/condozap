import { useState, useMemo } from "react";
import { PlusCircle, Building2, Grid3X3, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeaderSkeleton, StatsCardSkeleton, CardSkeleton } from "@/components/ui/skeleton";
import type { Resident } from "@/features/residents/types";
import { useAppSelector } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { selectCurrentCondominiumId } from "@/store/slices/condominiumSlice";
import { useResidents } from "@/features/residents/hooks/useResidentsApi";
import { ResidentDialog } from "@/features/residents";
import { TowerCard, StructureConfigDialog } from "../components";
import { useStructure } from "../hooks/useStructureApi";

export function StructurePage() {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStructureDialogOpen, setIsStructureDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | undefined>();

  // Buscar moradores do condomínio selecionado
  const condoIdToFetch = currentCondominiumId || '';

  // Buscar estrutura do condomínio
  const { data: structureData } = useStructure(condoIdToFetch);

  const {
    data: residents,
    isLoading,
    isError,
  } = useResidents(condoIdToFetch, {});

  // Group residents by tower
  const residentsByTower = useMemo(() => {
    if (!residents) return {};
    
    return residents.reduce((acc, resident) => {
      if (!acc[resident.tower]) {
        acc[resident.tower] = [];
      }
      acc[resident.tower].push(resident);
      return acc;
    }, {} as Record<string, Resident[]>);
  }, [residents]);

  // Sort towers alphabetically
  const towers = Object.keys(residentsByTower).sort();

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Validar se há condomínio selecionado
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
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Estrutura do Condomínio
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Visualização hierárquica de torres, andares e unidades
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsStructureDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Configurar Estrutura</span>
            <span className="sm:hidden">Configurar</span>
          </Button>
          <Button onClick={handleAddResident} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Morador
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {residents && residents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Torres</p>
                  <p className="text-2xl font-bold text-foreground">{towers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Grid3X3 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidades</p>
                  <p className="text-2xl font-bold text-foreground">{residents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <PlusCircle className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ocupação</p>
                  <p className="text-2xl font-bold text-foreground">100%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Towers Grid */}
      {residents && residents.length > 0 ? (
        <div className="space-y-4">
          {towers.map((tower) => (
            <TowerCard
              key={tower}
              towerName={tower}
              residents={residentsByTower[tower]}
            />
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Nenhuma unidade cadastrada
              </p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Comece adicionando moradores e suas unidades para visualizar a estrutura
              </p>
              <Button onClick={handleAddResident} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
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

      <StructureConfigDialog
        open={isStructureDialogOpen}
        onOpenChange={setIsStructureDialogOpen}
        condominiumId={currentCondominiumId!}
        currentStructure={structureData?.structure}
      />
    </div>
  );
}
