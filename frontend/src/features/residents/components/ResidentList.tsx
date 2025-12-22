import { useIsMobile } from "@/shared/hooks";
import type { Resident } from "../types";
import { ResidentTable } from "./ResidentTable";
import { ResidentMobileCard } from "./ResidentMobileCard";
import { useAuth } from "@/shared/hooks/useAuth";

interface ResidentListProps {
  residents: Resident[];
  onEdit: (resident: Resident) => void;
}

export const ResidentList = ({ residents, onEdit }: ResidentListProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  if (isMobile) {
    return (
      <div className="space-y-3">
        {residents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum morador cadastrado
          </div>
        ) : (
          residents.map((resident) => (
            <ResidentMobileCard
              key={resident.id}
              resident={resident}
              onEdit={onEdit}
              showCondominium={isSuperAdmin}
            />
          ))
        )}
      </div>
    );
  }

  return <ResidentTable residents={residents} onEdit={onEdit} />;
};

