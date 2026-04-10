import { useState, useMemo, useEffect, useCallback } from "react";
import { Clock, AlertTriangle, CheckCircle, Search, X } from "lucide-react";
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
import { Input } from "@/shared/components/ui/input";
import { PaginationTable } from "@/shared/components/ui/pagination-table";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import type { Complaint, ComplaintStatus, ComplaintPriority } from "@/features/complaints/types";
import type { Resident } from "@/features/residents/types";
import { ComplaintStatusBadge } from "../components";

interface SlaIndicatorProps {
  dueAt: string;
  status: ComplaintStatus;
}

const SLA_STATUSES = ["RESOLVED", "CLOSED"];

function SlaIndicator({ dueAt, status }: SlaIndicatorProps) {
  const isFinalStatus = SLA_STATUSES.includes(status);
  
  if (isFinalStatus) {
    return <span className="text-xs text-muted-foreground">Concluído</span>;
  }

  const now = new Date();
  const due = new Date(dueAt);
  const hoursLeft = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (hoursLeft < 0) {
    return (
      <span className="text-xs font-medium text-destructive">
        Atrasado ({Math.abs(hoursLeft)}h)
      </span>
    );
  }

  if (hoursLeft <= 4) {
    return (
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        {hoursLeft}h restantes
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">
      {hoursLeft}h restantes
    </span>
  );
}

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

  // Filter state
  const [searchId, setSearchId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const statusLabels: Record<ComplaintStatus, string> = {
    NEW: "Nova",
    TRIAGE: "Triagem",
    IN_PROGRESS: "Em andamento",
    WAITING_USER: "Aguard. usuario",
    WAITING_THIRD_PARTY: "Aguard. terceiro",
    RESOLVED: "Resolvida",
    CLOSED: "Encerrada",
    CANCELLED: "Cancelada",
    RETURNED: "Devolvida",
    REOPENED: "Reaberta",
  };

  const priorityLabels: Record<ComplaintPriority, string> = {
    CRITICAL: "Critica",
    HIGH: "Alta",
    MEDIUM: "Media",
    LOW: "Baixa",
  };

  const uniqueSectors = useMemo(() => {
    const sectors = new Set<string>();
    complaints.forEach((c) => {
      if (c.sector?.name) sectors.add(c.sector.name);
    });
    return Array.from(sectors).sort();
  }, [complaints]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    complaints.forEach((c) => {
      if (c.category) categories.add(c.category);
    });
    return Array.from(categories).sort();
  }, [complaints]);

  const hasActiveFilters =
    searchId !== "" ||
    searchText !== "" ||
    statusFilter !== "all" ||
    sectorFilter !== "all" ||
    categoryFilter !== "all" ||
    priorityFilter !== "all";

  const clearFilters = useCallback(() => {
    setSearchId("");
    setSearchText("");
    setStatusFilter("all");
    setSectorFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
    setCurrentPage(1);
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      if (searchId && !String(complaint.id).includes(searchId)) return false;
      if (
        searchText &&
        !complaint.content.toLowerCase().includes(searchText.toLowerCase())
      )
        return false;
      if (statusFilter !== "all" && complaint.status !== statusFilter)
        return false;
      if (
        sectorFilter !== "all" &&
        (complaint.sector?.name ?? "") !== sectorFilter
      )
        return false;
      if (categoryFilter !== "all" && complaint.category !== categoryFilter)
        return false;
      if (priorityFilter !== "all" && complaint.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [
    complaints,
    searchId,
    searchText,
    statusFilter,
    sectorFilter,
    categoryFilter,
    priorityFilter,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchId, searchText, statusFilter, sectorFilter, categoryFilter, priorityFilter]);

  const paginatedComplaints = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredComplaints.slice(startIndex, endIndex);
  }, [filteredComplaints, currentPage]);

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredComplaints.length, currentPage, totalPages]);

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

      {/* Filter Bar */}
      <div className="mb-4 bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Search by ID */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="pl-8 h-9 text-sm"
              type="number"
            />
          </div>

          {/* Text search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na descricao..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.entries(statusLabels) as [ComplaintStatus, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {/* Sector filter */}
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {uniqueSectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {(
                Object.entries(priorityLabels) as [ComplaintPriority, string][]
              ).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active filters info and clear button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {filteredComplaints.length} de {complaints.length} ocorrencia(s)
              encontrada(s)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Nº</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">SLA</TableHead>
                <TableHead className="font-bold">Categoria</TableHead>
                <TableHead className="font-bold hidden sm:table-cell">Setor</TableHead>
                <TableHead className="font-bold">Descrição</TableHead>
                <TableHead className="font-bold hidden sm:table-cell">Unidade</TableHead>
                <TableHead className="font-bold hidden sm:table-cell">Data</TableHead>
                <TableHead className="font-bold w-auto sm:w-[240px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComplaints.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {hasActiveFilters
                      ? "Nenhuma ocorrencia encontrada com os filtros aplicados"
                      : "Nenhuma ocorrencia registrada"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedComplaints.map((complaint) => (
                  <TableRow key={complaint.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="text-sm font-mono text-foreground">
                        #{complaint.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ComplaintStatusBadge
                        status={complaint.status}
                        size="md"
                      />
                    </TableCell>
                    <TableCell>
                      {complaint.resolutionDueAt ? (
                        <SlaIndicator
                          dueAt={complaint.resolutionDueAt}
                          status={complaint.status}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {complaint.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {complaint.sector?.name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-foreground truncate">
                        {complaint.content}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      {getResidentInfo(complaint.residentId)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                      {new Date(complaint.createdAt).toLocaleDateString(
                        "pt-BR"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
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
                        <SelectTrigger className="h-9 text-xs w-full sm:w-[160px]">
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
        {filteredComplaints.length > 0 && (
          <div className="p-4 border-t border-border">
            <PaginationTable
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredComplaints.length}
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
