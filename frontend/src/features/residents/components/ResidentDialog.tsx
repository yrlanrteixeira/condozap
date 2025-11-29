import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Resident } from "@/types";
import { ResidentForm, type ResidentFormData } from "./ResidentForm";

interface ResidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingResident: Resident | null;
  formData: ResidentFormData;
  onFormChange: (formData: ResidentFormData) => void;
  onSave: () => void;
}

export const ResidentDialog = ({
  open,
  onOpenChange,
  editingResident,
  formData,
  onFormChange,
  onSave,
}: ResidentDialogProps) => {
  const isFormValid =
    formData.name && formData.phone && formData.floor && formData.unit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
            {editingResident ? "Editar Morador" : "Adicionar Novo Morador"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {editingResident
              ? "Atualize as informações do morador"
              : "Preencha os dados para adicionar um novo morador ao condomínio"}
          </DialogDescription>
        </DialogHeader>

        <ResidentForm formData={formData} onChange={onFormChange} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={!isFormValid}>
            {editingResident ? "Salvar Alterações" : "Adicionar Morador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
