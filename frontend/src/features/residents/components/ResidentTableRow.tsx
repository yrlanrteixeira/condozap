import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useDeleteResident } from "../hooks/useResidentsApi";
import type { Resident } from "../types";

interface ResidentTableRowProps {
  resident: Resident;
  onEdit: (resident: Resident) => void;
  showCondominium?: boolean;
}

export const ResidentTableRow = ({
  resident,
  onEdit,
  showCondominium = false,
}: ResidentTableRowProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const deleteResident = useDeleteResident();

  const handleDelete = async () => {
    try {
      await deleteResident.mutateAsync(resident.id);
      
      toast({
        title: "Morador removido!",
        description: `${resident.name} foi removido com sucesso.`,
        variant: "success",
        duration: 3000,
      });
      
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete resident:", error);
      
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o morador. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <>
      <TableRow className="hover:bg-muted/30 border-b border-border/50">
        <TableCell className="font-medium text-foreground">
          {resident.name || '-'}
        </TableCell>
        {showCondominium && (
          <TableCell className="text-sm text-muted-foreground">
            {(resident as any).condominium?.name || '-'}
          </TableCell>
        )}
        <TableCell className="font-mono text-muted-foreground">
          {resident.phone || '-'}
        </TableCell>
        <TableCell className="text-sm text-foreground">
          {resident.tower || '-'}
        </TableCell>
        <TableCell className="text-sm text-foreground">
          {resident.floor || '-'}
        </TableCell>
        <TableCell className="text-sm text-foreground">
          {resident.unit || '-'}
      </TableCell>
      <TableCell>
          <div className="flex items-center gap-2">
        <Button
          variant="link"
          size="sm"
              className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
          onClick={() => onEdit(resident)}
        >
          <Pencil size={14} className="mr-1" />
          Editar
        </Button>
            <Button
              variant="link"
              size="sm"
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0 h-auto font-medium"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 size={14} className="mr-1" />
              Excluir
            </Button>
          </div>
      </TableCell>
    </TableRow>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Confirmar exclusão"
        description={`Tem certeza que deseja remover ${resident.name}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={deleteResident.isPending}
      />
    </>
  );
};
