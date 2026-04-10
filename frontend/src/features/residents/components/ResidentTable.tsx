import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useAuth } from "@/shared/hooks/useAuth";
import type { Resident } from "../types";
import { ResidentTableRow } from "./ResidentTableRow";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

interface ResidentTableProps {
  residents: Resident[];
  onEdit: (resident: Resident) => void;
}

export const ResidentTable = ({ residents, onEdit }: ResidentTableProps) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isMobile = useMediaQuery("(max-width: 640px)");

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
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

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
            <TableHead className="font-bold text-foreground">Nome</TableHead>
            {isSuperAdmin && (
              <TableHead className="font-bold text-foreground">
                Condomínio
              </TableHead>
            )}
            <TableHead className="font-bold text-foreground">
              Telefone
            </TableHead>
            <TableHead className="font-bold text-foreground">Torre</TableHead>
            <TableHead className="font-bold text-foreground">Andar</TableHead>
            <TableHead className="font-bold text-foreground">Unidade</TableHead>
            <TableHead className="font-bold text-foreground w-[120px]">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={isSuperAdmin ? 7 : 6}
                className="text-center py-8 text-muted-foreground"
              >
                Nenhum morador cadastrado
              </TableCell>
            </TableRow>
          ) : (
            residents.map((resident) => (
              <ResidentTableRow
                key={resident.id}
                resident={resident}
                onEdit={onEdit}
                showCondominium={isSuperAdmin}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

import { Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

function ResidentMobileCard({
  resident,
  onEdit,
  showCondominium,
}: {
  resident: Resident;
  onEdit: (resident: Resident) => void;
  showCondominium: boolean;
}) {
  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-card hover:bg-muted/30 transition-colors">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="font-medium text-foreground truncate flex-1">
          {resident.name || "-"}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/80 p-0 h-auto shrink-0"
          onClick={() => onEdit(resident)}
        >
          <Pencil size={14} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Telefone</span>
          <p className="font-mono text-muted-foreground">{resident.phone || "-"}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Unidade</span>
          <p className="text-foreground">
            {resident.tower || "-"}/{resident.floor || "-"}/{resident.unit || "-"}
          </p>
        </div>
        {showCondominium && (
          <div className="col-span-2">
            <span className="text-muted-foreground text-xs">Condomínio</span>
            <p className="text-muted-foreground">{resident.condominium?.name || "-"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
