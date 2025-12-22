import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/components/ui/use-toast";
import type { Resident } from "../types";
import { ResidentForm, type ResidentFormData } from "./ResidentForm";
import { useCreateResident, useUpdateResident } from "../hooks/useResidentsApi";
import { useAppSelector } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";

interface ResidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident?: Resident;
  onClose?: () => void;
}

const initialFormData: ResidentFormData = {
  name: "",
  email: "",
  phone: "",
  tower: "A",
  floor: "",
  unit: "",
  condominiumId: "",
};

// Formata telefone para o padrão brasileiro esperado pelo backend (55XXXXXXXXXX)
function formatPhoneForApi(phone: string): string {
  // Remove tudo que não é número
  const digits = phone.replace(/\D/g, '');
  
  // Se já começar com 55, retorna como está
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  
  // Se tiver 10 ou 11 dígitos, adiciona 55
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }
  
  // Retorna o que foi digitado (o backend vai validar)
  return digits;
}

export const ResidentDialog = ({
  open,
  onOpenChange,
  resident,
  onClose,
}: ResidentDialogProps) => {
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const [formData, setFormData] = useState<ResidentFormData>(initialFormData);
  const { toast } = useToast();

  const createResident = useCreateResident();
  const updateResident = useUpdateResident();

  // Reset form when dialog opens/closes or resident changes
  useEffect(() => {
    if (open && resident) {
      setFormData({
        name: resident.name,
        email: resident.email,
        phone: resident.phone,
        tower: resident.tower,
        floor: resident.floor,
        unit: resident.unit,
        condominiumId: resident.condominiumId,
      });
    } else if (open && !resident) {
      setFormData({
        ...initialFormData,
        condominiumId: currentCondominiumId || "",
      });
    }
  }, [open, resident, currentCondominiumId]);

  const isFormValid =
    formData.name && formData.email && formData.phone && formData.floor && formData.unit;

  const handleSave = async () => {
    const condoId = formData.condominiumId || currentCondominiumId;
    if (!condoId || !isFormValid) return;

    try {
      if (resident) {
        // Update existing resident
        await updateResident.mutateAsync({
          id: resident.id,
          ...formData,
          phone: formatPhoneForApi(formData.phone),
          condominiumId: condoId,
        });

        toast({
          title: "Morador atualizado!",
          description: `${formData.name} foi atualizado com sucesso.`,
          variant: "success",
          duration: 3000,
        });
      } else {
        // Create new resident
        await createResident.mutateAsync({
          ...formData,
          phone: formatPhoneForApi(formData.phone),
          condominiumId: condoId,
          type: "OWNER", // Default to OWNER
        });

        toast({
          title: "Morador cadastrado!",
          description: `${formData.name} foi adicionado com sucesso.`,
          variant: "success",
          duration: 3000,
        });
      }

      handleClose();
    } catch (error) {
      console.error("Failed to save resident:", error);

      toast({
        title: "Erro ao salvar",
        description: resident
          ? "Não foi possível atualizar o morador. Tente novamente."
          : "Não foi possível cadastrar o morador. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onOpenChange(false);
    onClose?.();
  };

  const isLoading = createResident.isPending || updateResident.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
            {resident ? "Editar Morador" : "Adicionar Novo Morador"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {resident
              ? "Atualize as informações do morador"
              : "Preencha os dados para adicionar um novo morador ao condomínio"}
          </DialogDescription>
        </DialogHeader>

        <ResidentForm formData={formData} onChange={setFormData} />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid || isLoading}>
            {isLoading
              ? "Salvando..."
              : resident
                ? "Salvar Alterações"
                : "Adicionar Morador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
