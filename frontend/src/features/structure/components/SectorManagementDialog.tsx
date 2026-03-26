import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, FolderKanban, X, Tag } from "lucide-react";
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
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  useSectors,
  useCreateSector,
  useUpdateSector,
  useDeleteSector,
} from "../hooks/useSectorsApi";

interface SectorManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominiumId: string;
}

export const SectorManagementDialog = ({
  open,
  onOpenChange,
  condominiumId,
}: SectorManagementDialogProps) => {
  const { toast } = useToast();
  const { data: sectors = [], isLoading } = useSectors(condominiumId);
  const createSector = useCreateSector();
  const updateSector = useUpdateSector();
  const deleteSector = useDeleteSector();

  const [showForm, setShowForm] = useState(false);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [sectorName, setSectorName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");

  const isMutating =
    createSector.isPending ||
    updateSector.isPending ||
    deleteSector.isPending;

  // Reset form state when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setShowForm(false);
    setEditingSectorId(null);
    setSectorName("");
    setCategories([]);
    setCategoryInput("");
  };

  const handleAddCategory = () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      toast({
        title: "Categoria duplicada",
        description: "Essa categoria já foi adicionada.",
        variant: "error",
        duration: 3000,
      });
      return;
    }
    setCategories([...categories, trimmed]);
    setCategoryInput("");
  };

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter((c) => c !== category));
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCategory();
    }
  };

  const handleEdit = (sector: { id: string; name: string; categories: string[] }) => {
    setEditingSectorId(sector.id);
    setSectorName(sector.name);
    setCategories([...sector.categories]);
    setCategoryInput("");
    setShowForm(true);
  };

  const handleDelete = async (sectorId: string) => {
    try {
      await deleteSector.mutateAsync({ condominiumId, sectorId });
      toast({
        title: "Setor removido!",
        description: "O setor foi removido com sucesso.",
        variant: "success",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description:
          error?.response?.data?.error ||
          "Não foi possível remover o setor. Verifique se não há chamados vinculados.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  const handleSave = async () => {
    if (!sectorName.trim()) {
      toast({
        title: "Erro de validação",
        description: "O nome do setor é obrigatório.",
        variant: "error",
        duration: 3000,
      });
      return;
    }

    try {
      if (editingSectorId) {
        await updateSector.mutateAsync({
          condominiumId,
          sectorId: editingSectorId,
          name: sectorName.trim(),
          categories,
        });
        toast({
          title: "Setor atualizado!",
          description: "O setor foi atualizado com sucesso.",
          variant: "success",
          duration: 3000,
        });
      } else {
        await createSector.mutateAsync({
          condominiumId,
          name: sectorName.trim(),
          categories,
        });
        toast({
          title: "Setor criado!",
          description: "O novo setor foi criado com sucesso.",
          variant: "success",
          duration: 3000,
        });
      }
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description:
          error?.response?.data?.error ||
          "Não foi possível salvar o setor. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Gerenciar Setores
          </DialogTitle>
          <DialogDescription>
            Crie e edite os setores de atendimento e suas categorias
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* New sector button */}
          {!showForm && (
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="w-full"
              disabled={isMutating}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Setor
            </Button>
          )}

          {/* Create/Edit form */}
          {showForm && (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold text-foreground">
                  {editingSectorId ? "Editar Setor" : "Novo Setor"}
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="sector-name">Nome do Setor</Label>
                  <Input
                    id="sector-name"
                    value={sectorName}
                    onChange={(e) => setSectorName(e.target.value)}
                    placeholder="Ex: Manutenção, Financeiro..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-input">Categorias</Label>
                  <div className="flex gap-2">
                    <Input
                      id="category-input"
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      placeholder="Digite uma categoria e pressione Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCategory}
                      disabled={!categoryInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {categories.map((category) => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Tag className="h-3 w-3" />
                          {category}
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(category)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetForm}
                    disabled={isMutating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isMutating}
                  >
                    {isMutating
                      ? "Salvando..."
                      : editingSectorId
                        ? "Salvar Alterações"
                        : "Criar Setor"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing sectors list */}
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando setores...
            </div>
          ) : sectors.length === 0 && !showForm ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum setor cadastrado. Clique em "Novo Setor" para criar.
            </div>
          ) : (
            sectors.map((sector) => (
              <Card key={sector.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <FolderKanban className="h-4 w-4" />
                        {sector.name}
                      </h4>
                      {sector.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {sector.categories.map((category) => (
                            <Badge
                              key={category}
                              variant="secondary"
                              className="text-xs"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(sector)}
                        disabled={isMutating || showForm}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sector.id)}
                        disabled={isMutating}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMutating}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
