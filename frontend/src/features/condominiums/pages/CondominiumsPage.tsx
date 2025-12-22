/**
 * Condominiums Management Page
 *
 * Página para SUPER_ADMIN gerenciar condomínios
 */

import { useState } from "react";
import { Building2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useToast } from "@/shared/components/ui/use-toast";
import {
  useCondominiums,
  useCreateCondominium,
  useUpdateCondominium,
  useDeleteCondominium,
} from "../hooks/useCondominiumsApi";
import { CondominiumCard, CondominiumForm } from "../components";
import type { Condominium, CondominiumStatus } from "../types";
import type { CreateCondominiumInput } from "../schemas";

export function CondominiumsPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCondominium, setEditingCondominium] =
    useState<Condominium | null>(null);
  const [deletingCondominium, setDeletingCondominium] =
    useState<Condominium | null>(null);

  const { data: condominiums = [], isLoading, isError } = useCondominiums();
  const createMutation = useCreateCondominium();
  const updateMutation = useUpdateCondominium();
  const deleteMutation = useDeleteCondominium();

  const handleCreate = () => {
    setEditingCondominium(null);
    setIsFormOpen(true);
  };

  const handleEdit = (condominium: Condominium) => {
    setEditingCondominium(condominium);
    setIsFormOpen(true);
  };

  const handleDelete = (condominium: Condominium) => {
    setDeletingCondominium(condominium);
  };

  const handleSubmit = async (
    data: CreateCondominiumInput & { status?: CondominiumStatus }
  ) => {
    try {
      if (editingCondominium) {
        await updateMutation.mutateAsync({
          id: editingCondominium.id,
          ...data,
        });
        toast({
          title: "Condomínio atualizado",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        await createMutation.mutateAsync(data);
        toast({
          title: "Condomínio criado",
          description: "O novo condomínio foi cadastrado com sucesso.",
        });
      }
      setIsFormOpen(false);
      setEditingCondominium(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description:
          error.response?.data?.message || "Ocorreu um erro ao salvar.",
        variant: "error",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCondominium) return;

    try {
      await deleteMutation.mutateAsync(deletingCondominium.id);
      toast({
        title: "Condomínio excluído",
        description: "O condomínio foi removido do sistema.",
      });
      setDeletingCondominium(null);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description:
          error.response?.data?.message ||
          "Não foi possível excluir o condomínio.",
        variant: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Erro ao carregar condomínios. Tente novamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Condomínios</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os condomínios do sistema
            </p>
          </div>
        </div>

        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Condomínio
        </Button>
      </div>

      {/* Condominiums List */}
      {condominiums.length > 0 ? (
        <div className="grid gap-4">
          {condominiums.map((condominium) => (
            <CondominiumCard
              key={condominium.id}
              condominium={condominium}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhum condomínio cadastrado
              </p>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Comece criando seu primeiro condomínio para gerenciar moradores
                e ocorrências.
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Condomínio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <CondominiumForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        condominium={editingCondominium}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCondominium}
        onOpenChange={(open) => !open && setDeletingCondominium(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Condomínio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o condomínio{" "}
              <strong>{deletingCondominium?.name}</strong>? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CondominiumsPage;
