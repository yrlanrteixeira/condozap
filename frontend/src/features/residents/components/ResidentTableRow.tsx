import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Resident } from "@/types";

interface ResidentTableRowProps {
  resident: Resident;
  onEdit: (resident: Resident) => void;
}

export const ResidentTableRow = ({
  resident,
  onEdit,
}: ResidentTableRowProps) => {
  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="font-medium">{resident.name}</TableCell>
      <TableCell className="font-mono text-muted-foreground">
        {resident.phone}
      </TableCell>
      <TableCell className="text-sm">{resident.tower}</TableCell>
      <TableCell className="text-sm">{resident.floor}</TableCell>
      <TableCell className="text-sm">{resident.unit}</TableCell>
      <TableCell>
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0 h-auto"
          onClick={() => onEdit(resident)}
        >
          <Pencil size={14} className="mr-1" />
          Editar
        </Button>
      </TableCell>
    </TableRow>
  );
};
