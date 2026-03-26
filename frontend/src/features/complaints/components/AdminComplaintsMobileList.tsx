import { useMemo, useState } from "react";
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { ComplaintStatusBadge } from "./ComplaintStatusBadge";
import type { Complaint, ComplaintStatus } from "../types";
import type { Resident } from "@/features/residents/types";
import { formatDate } from "@/shared/utils/helpers";

const STATUS_FILTERS: { value: ComplaintStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "NEW", label: "Novas" },
  { value: "TRIAGE", label: "Triagem" },
  { value: "IN_PROGRESS", label: "Andamento" },
  { value: "WAITING_USER", label: "Aguardando" },
  { value: "RESOLVED", label: "Resolvidas" },
];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "border-l-red-500",
  HIGH: "border-l-orange-500",
  MEDIUM: "border-l-blue-500",
  LOW: "border-l-emerald-500",
};

interface AdminComplaintsMobileListProps {
  complaints: Complaint[];
  residents: Resident[];
  onComplaintClick?: (complaint: Complaint) => void;
}

export function AdminComplaintsMobileList({
  complaints,
  residents,
  onComplaintClick,
}: AdminComplaintsMobileListProps) {
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const residentMap = useMemo(
    () => new Map(residents.map((r) => [r.id, r])),
    [residents]
  );

  const filteredComplaints = useMemo(() => {
    let result = complaints;

    if (statusFilter !== "ALL") {
      result = result.filter((c) =>
        statusFilter === "TRIAGE"
          ? c.status === "TRIAGE" || c.status === "NEW"
          : c.status === statusFilter
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.content.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          residentMap.get(c.residentId)?.name?.toLowerCase().includes(q)
      );
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [complaints, statusFilter, searchQuery, residentMap]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    complaints.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [complaints]);

  const openCount =
    (statusCounts["NEW"] || 0) +
    (statusCounts["TRIAGE"] || 0) +
    (statusCounts["IN_PROGRESS"] || 0) +
    (statusCounts["WAITING_USER"] || 0) +
    (statusCounts["WAITING_THIRD_PARTY"] || 0);

  return (
    <div className="space-y-3">
      {/* Stats resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-card border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{complaints.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg bg-card border p-3 text-center">
          <p className="text-2xl font-bold text-warning">{openCount}</p>
          <p className="text-xs text-muted-foreground">Abertas</p>
        </div>
        <div className="rounded-lg bg-card border p-3 text-center">
          <p className="text-2xl font-bold text-success">
            {(statusCounts["RESOLVED"] || 0) + (statusCounts["CLOSED"] || 0)}
          </p>
          <p className="text-xs text-muted-foreground">Resolvidas</p>
        </div>
      </div>

      {/* Busca e filtro */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ocorrência..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtros por status */}
      {showFilters && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
              {filter.value !== "ALL" && statusCounts[filter.value] !== undefined && (
                <span className="ml-1 opacity-70">({statusCounts[filter.value]})</span>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Lista de cards */}
      <div className="space-y-2">
        {filteredComplaints.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "ALL"
                ? "Nenhuma ocorrência encontrada com esses filtros."
                : "Nenhuma ocorrência registrada."}
            </p>
          </div>
        ) : (
          filteredComplaints.map((complaint) => {
            const resident = residentMap.get(complaint.residentId);
            const dateField = complaint.timestamp || complaint.createdAt;
            const priorityBorder = PRIORITY_COLORS[complaint.priority] || PRIORITY_COLORS.MEDIUM;

            return (
              <button
                key={complaint.id}
                className={`w-full text-left rounded-lg border-l-4 ${priorityBorder} bg-card border border-border p-3 active:bg-accent transition-colors`}
                onClick={() => onComplaintClick?.(complaint)}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <ComplaintStatusBadge status={complaint.status} size="sm" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(dateField)}
                  </span>
                </div>

                <p className="text-sm font-medium text-foreground line-clamp-2 mb-1.5">
                  {complaint.content}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs h-5">
                      {complaint.category}
                    </Badge>
                    {resident && (
                      <span>
                        {resident.unit}/{resident.tower}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Contador de resultados */}
      {filteredComplaints.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          {filteredComplaints.length} de {complaints.length} ocorrência{complaints.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
