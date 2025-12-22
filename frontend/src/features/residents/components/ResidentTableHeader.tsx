import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface ResidentTableHeaderProps {
  onAddNew: () => void;
}

export const ResidentTableHeader = ({ onAddNew }: ResidentTableHeaderProps) => {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <h3 className="text-lg font-semibold text-foreground">Moradores</h3>
      <Button
        onClick={onAddNew}
        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus size={16} />
        Adicionar Novo Morador
      </Button>
    </div>
  );
};
