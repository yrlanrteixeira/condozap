import { PlusCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface ResidentPageHeaderProps {
  title?: string;
  description?: string;
  onAddResident?: () => void;
}

export const ResidentPageHeader = ({
  title = "Moradores",
  description = "Gerencie os moradores e suas unidades",
  onAddResident,
}: ResidentPageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-primary/10 shrink-0 text-xl sm:text-2xl">
          👥
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">{description}</p>
        </div>
      </div>
      {onAddResident && (
        <Button onClick={onAddResident} className="shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Morador
        </Button>
      )}
    </div>
  );
};
