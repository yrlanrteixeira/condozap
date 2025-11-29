import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Resident } from "@/types";
import { ResidentTableRow } from "./ResidentTableRow";

interface ResidentTableProps {
  residents: Resident[];
  onEdit: (resident: Resident) => void;
}

export const ResidentTable = ({ residents, onEdit }: ResidentTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-bold">Nome</TableHead>
            <TableHead className="font-bold">Telefone</TableHead>
            <TableHead className="font-bold">Torre</TableHead>
            <TableHead className="font-bold">Andar</TableHead>
            <TableHead className="font-bold">Unidade</TableHead>
            <TableHead className="font-bold w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {residents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
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
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
