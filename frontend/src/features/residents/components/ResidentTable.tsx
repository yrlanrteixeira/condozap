import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import type { Resident } from "../types";
import { ResidentTableRow } from "./ResidentTableRow";

interface ResidentTableProps {
  residents: Resident[];
  onEdit: (resident: Resident) => void;
}

export const ResidentTable = ({ residents, onEdit }: ResidentTableProps) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div className="overflow-x-auto rounded-lg">
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
