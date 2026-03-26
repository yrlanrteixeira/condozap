import { useState, useMemo, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { PaginationTable } from "@/shared/components/ui/pagination-table";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import type { Complaint, ComplaintStatus } from "@/features/complaints/types";
import type { Resident } from "@/features/residents/types";
import { ComplaintStatusBadge } from "../components";

interface AdminComplaintsTablePageProps {
  complaints: Complaint[];
  residents: Resident[];
  onStatusChange: (complaintId: number, newStatus: ComplaintStatus) => void;
  onComplaintClick?: (complaint: Complaint) => void;
}

export function AdminComplaintsTablePage({
  complaints,
  residents,
  onStatusChange,
  onComplaintClick,
}: AdminComplaintsTablePageProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    complaintId: number;
    newStatus: ComplaintStatus;
  } | null>(null);

  const paginatedComplaints = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return complaints.slice(startIndex, endIndex);
  }, [complaints, currentPage]);

  const totalPages = Math.ceil(complaints.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [complaints.length, currentPage, totalPages]);

  const residentMap = useMemo(
    () => new Map(residents.map((r) => [r.id, r])),
    [residents]
  );

  const getResidentInfo = (residentId: string) => {
    const resident = residentMap.get(residentId);
    return resident ? `${resident.unit} - Torre ${resident.tower}` : "Anônimo";
  };

  const handleStatusChangeRequest = (
    complaintId: number,
    newStatus: ComplaintStatus
  ) => {
    setPendingChange({ complaintId, newStatus });
    setConfirmDialogOpen(true);
  };

  const handleConfirmStatusChange = () => {
    if (pendingChange) {
      onStatusChange(pendingChange.complaintId, pendingChange.newStatus);
      setPendingChange(null);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Gestão de Ocorrências (Tabela)
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Visualização em tabela. Altere o status para notificar o morador
          automaticamente.
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Categoria</TableHead>
                <TableHead className="font-bold">Descrição</TableHead>
                <TableHead className="font-bold">Unidade</TableHead>
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="font-bold w-[240px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhuma ocorrência registrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedComplaints.map((complaint) => (
                  <TableRow key={complaint.id} className="hover:bg-muted/30">
                    <TableCell>
                      <ComplaintStatusBadge
                        status={complaint.status}
                        size="md"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {complaint.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-foreground truncate">
                        {complaint.content}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getResidentInfo(complaint.residentId)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(complaint.createdAt).toLocaleDateString(
                        "pt-BR"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {onComplaintClick && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 shrink-0"
                            onClick={() => onComplaintClick(complaint)}
                          >
                            Detalhes
                          </Button>
                        )}
                        <Select
                          value={complaint.status}
                          onValueChange={(value) =>
                            handleStatusChangeRequest(
                              complaint.id,
                              value as ComplaintStatus
                            )
                          }
                        >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Alterar status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRIAGE">
                            <div className="flex items-center gap-2">
                              <AlertTriangle
                                size={14}
                                className="text-amber-600 dark:text-amber-400"
                              />
                              Triagem
                            </div>
                          </SelectItem>
                          <SelectItem value="IN_PROGRESS">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-blue-600 dark:text-blue-400" />
                              Em atendimento
                            </div>
                          </SelectItem>
                          <SelectItem value="WAITING_USER">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                              Aguardando usuário
                            </div>
                          </SelectItem>
                          <SelectItem value="WAITING_THIRD_PARTY">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                              Aguardando terceiro
                            </div>
                          </SelectItem>
                          <SelectItem value="RESOLVED">
                            <div className="flex items-center gap-2">
                              <CheckCircle
                                size={14}
                                className="text-green-600 dark:text-green-400"
                              />
                              Resolvido
                            </div>
                          </SelectItem>
                          <SelectItem value="CLOSED">
                            <div className="flex items-center gap-2">
                              <CheckCircle
                                size={14}
                                className="text-emerald-600 dark:text-emerald-400"
                              />
                              Encerrado
                            </div>
                          </SelectItem>
                          <SelectItem value="CANCELLED">
                            <div className="flex items-center gap-2">
                              <AlertTriangle
                                size={14}
                                className="text-muted-foreground"
                              />
                              Cancelado
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {complaints.length > 0 && (
          <div className="p-4 border-t border-border">
            <PaginationTable
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={complaints.length}
              showInfo={true}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Confirmar Alteração de Status"
        description="O morador será notificado automaticamente sobre esta alteração. Deseja continuar?"
        confirmText="Sim, alterar status"
        cancelText="Cancelar"
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
}
