import { Edit, Phone, Building2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Resident } from "../types";

interface ResidentMobileCardProps {
  resident: Resident;
  onEdit: (resident: Resident) => void;
  showCondominium?: boolean;
}

export const ResidentMobileCard = ({
  resident,
  onEdit,
  showCondominium = false,
}: ResidentMobileCardProps) => {
  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-base mb-1">
              {resident.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{resident.phone}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(resident)}
            className="shrink-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {showCondominium && resident.condominium && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <Building2 className="h-3 w-3" />
            <span>{resident.condominium.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground font-medium">
              Torre {resident.tower}
            </span>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-muted-foreground">
              Andar <span className="text-foreground font-medium">{resident.floor}</span>
            </span>
            <span className="text-muted-foreground">
              Unid. <span className="text-foreground font-medium">{resident.unit}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

