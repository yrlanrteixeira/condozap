import { useState, useEffect } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useToast } from "@/shared/components/ui/use-toast";
import { useUpdateStructure, type TowerStructure, type CondominiumStructure } from "../hooks/useStructureApi";
import { getApiErrorMessage } from "@/shared/utils/errorMessages";

interface StructureConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominiumId: string;
  currentStructure?: CondominiumStructure;
}

export const StructureConfigDialog = ({
  open,
  onOpenChange,
  condominiumId,
  currentStructure,
}: StructureConfigDialogProps) => {
  const { toast } = useToast();
  const updateStructure = useUpdateStructure();

  const [towers, setTowers] = useState<TowerStructure[]>([
    { name: "A", floors: ["1", "2", "3", "4", "5"], unitsPerFloor: 4 },
  ]);

  // Load current structure when dialog opens
  useEffect(() => {
    if (open && currentStructure && currentStructure.towers.length > 0) {
      setTowers(currentStructure.towers);
    } else if (open) {
      // Default structure
      setTowers([{ name: "A", floors: ["1", "2", "3", "4", "5"], unitsPerFloor: 4 }]);
    }
  }, [open, currentStructure]);

  const handleAddTower = () => {
    const lastTower = towers[towers.length - 1];
    const nextLetter = String.fromCharCode(lastTower.name.charCodeAt(0) + 1);
    
    setTowers([
      ...towers,
      { 
        name: nextLetter, 
        floors: ["1", "2", "3", "4", "5"], 
        unitsPerFloor: 4 
      },
    ]);
  };

  const handleRemoveTower = (index: number) => {
    setTowers(towers.filter((_, i) => i !== index));
  };

  const handleUpdateTower = (index: number, field: keyof TowerStructure, value: string | number) => {
    const newTowers = [...towers];
    const tower = newTowers[index];
    if (!tower) return;

    if (field === "floors") {
      // Parse floors string like "1-5" or "1,2,3"
      const floorsStr = value as string;
      if (floorsStr.includes("-")) {
        const [start, end] = floorsStr.split("-").map(Number);
        tower.floors = Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
      } else {
        tower.floors = floorsStr.split(",").map(f => f.trim());
      }
    } else if (field === "name") {
      tower.name = value as string;
    } else if (field === "unitsPerFloor") {
      tower.unitsPerFloor = value as number;
    }
    setTowers(newTowers);
  };

  const handleSave = async () => {
    // Validation
    if (towers.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Adicione pelo menos uma torre",
        variant: "error",
        duration: 3000,
      });
      return;
    }

    for (const tower of towers) {
      if (!tower.name || tower.floors.length === 0 || tower.unitsPerFloor < 1) {
        toast({
          title: "Erro de validação",
          description: "Todas as torres precisam ter nome, andares e unidades por andar",
          variant: "error",
          duration: 3000,
        });
        return;
      }
    }

    try {
      await updateStructure.mutateAsync({
        condominiumId,
        structure: { towers },
      });

      toast({
        title: "Estrutura atualizada!",
        description: "A estrutura do condomínio foi configurada com sucesso.",
        variant: "success",
        duration: 3000,
      });

      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: getApiErrorMessage(error),
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configurar Estrutura do Condomínio
          </DialogTitle>
          <DialogDescription>
            Defina as torres, andares e unidades do seu condomínio. Esta configuração
            será usada no cadastro de moradores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {towers.map((tower, index) => (
            <Card key={index} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Torre {tower.name}
                  </h4>
                  {towers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTower(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`tower-name-${index}`}>Nome da Torre</Label>
                    <Input
                      id={`tower-name-${index}`}
                      value={tower.name}
                      onChange={(e) => handleUpdateTower(index, "name", e.target.value)}
                      placeholder="A"
                      maxLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tower-floors-${index}`}>
                      Andares (ex: 1-5 ou 1,2,3)
                    </Label>
                    <Input
                      id={`tower-floors-${index}`}
                      defaultValue={tower.floors.join(",")}
                      onBlur={(e) => handleUpdateTower(index, "floors", e.target.value)}
                      placeholder="1-5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`tower-units-${index}`}>
                      Unidades/Andar
                    </Label>
                    <Input
                      id={`tower-units-${index}`}
                      type="number"
                      min="1"
                      value={tower.unitsPerFloor}
                      onChange={(e) =>
                        handleUpdateTower(index, "unitsPerFloor", parseInt(e.target.value))
                      }
                      placeholder="4"
                    />
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  {tower.floors.length} andares × {tower.unitsPerFloor} unidades ={" "}
                  <span className="font-semibold text-foreground">
                    {tower.floors.length * tower.unitsPerFloor} unidades totais
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={handleAddTower}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Torre
          </Button>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">Resumo</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• {towers.length} torre(s)</p>
              <p>
                • Total de unidades:{" "}
                <span className="font-semibold text-foreground">
                  {towers.reduce((acc, t) => acc + t.floors.length * t.unitsPerFloor, 0)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateStructure.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateStructure.isPending}>
            {updateStructure.isPending ? "Salvando..." : "Salvar Estrutura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

