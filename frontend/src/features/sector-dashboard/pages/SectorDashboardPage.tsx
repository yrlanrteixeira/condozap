import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { StatsCardSkeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@/shared/hooks/useAuth";
import { useAppSelector } from "@/shared/hooks/useAppSelector";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { api } from "@/lib/api";
import { useComplaints, useUpdateComplaintStatus } from "@/features/complaints/hooks/useComplaintsApi";
import {
  ComplaintDetailSheet,
  ComplaintStatusBadge,
} from "@/features/complaints/components";
import { useToast } from "@/shared/components/ui/use-toast";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { Complaint } from "@/features/complaints/types";
import { SectorDashboardKPIs } from "../components/SectorDashboardKPIs";

interface SectorStats {
  openCount: number;
  resolvedLast30Days: number;
  slaCompliancePercent: number;
  avgResponseTimeHours: number;
}

export default function SectorDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);

  const sectors = user?.sectors ?? [];

  const [activeSectorId, setActiveSectorId] = useState<string>(
    () => sectors[0]?.sectorId ?? ""
  );

  const [detailSheet, setDetailSheet] = useState<{
    id: number | null;
    open: boolean;
  }>({ id: null, open: false });

  const condoId = currentCondominiumId ?? "";

  // Fetch KPI stats for the active sector
  const {
    data: stats,
    isLoading: isLoadingStats,
    isError: isStatsError,
  } = useQuery<SectorStats>({
    queryKey: ["sector-dashboard", "stats", activeSectorId],
    queryFn: async () => {
      const { data } = await api.get("/sector-dashboard/stats", {
        params: { sectorId: activeSectorId },
      });
      return data as SectorStats;
    },
    enabled: !!activeSectorId,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch complaints filtered by sector
  const { data: complaints = [], isLoading: isLoadingComplaints } =
    useComplaints(condoId, { sectorId: activeSectorId });

  const updateComplaintStatus = useUpdateComplaintStatus();

  const handleStatusChange = async (
    complaintId: number,
    newStatus: Complaint["status"]
  ) => {
    try {
      await updateComplaintStatus.mutateAsync({
        id: complaintId,
        status: newStatus,
      });
      toast({
        title: "Status atualizado!",
        description: "Status da ocorrencia foi alterado com sucesso.",
        variant: "success",
        duration: 3000,
      });
    } catch {
      toast({
        title: "Erro ao atualizar",
        description: "Nao foi possivel atualizar o status. Tente novamente.",
        variant: "error",
        duration: 5000,
      });
    }
  };

  // Guard: no sector membership
  if (sectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="p-6 sm:p-8 max-w-md text-center">
          <CardContent className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Nenhum setor associado
            </h3>
            <p className="text-sm text-muted-foreground">
              Voce ainda nao foi adicionado a nenhum setor. Contacte o
              administrador do condominio.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSectorName =
    sectors.find((s) => s.sectorId === activeSectorId)?.sectorName ??
    "Setor";

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Dashboard do Setor
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeSectorName}
          </p>
        </div>

        {/* Sector selector — only shown when user belongs to multiple sectors */}
        {sectors.length > 1 && (
          <Select value={activeSectorId} onValueChange={setActiveSectorId}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Selecionar setor" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((s) => (
                <SelectItem key={s.sectorId} value={s.sectorId}>
                  {s.sectorName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI Cards */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      ) : isStatsError || !stats ? (
        <Card className="p-6">
          <CardContent>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">Erro ao carregar metricas do setor.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <SectorDashboardKPIs stats={stats} />
      )}

      {/* Complaints Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Ocorrencias</h3>
          {!isLoadingComplaints && (
            <span className="text-sm text-muted-foreground">
              {complaints.length}{" "}
              {complaints.length === 1 ? "ocorrencia" : "ocorrencias"}
            </span>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {isLoadingComplaints ? (
            <div className="p-8 text-center">
              <div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Categoria</TableHead>
                    <TableHead className="font-bold hidden sm:table-cell">
                      Descricao
                    </TableHead>
                    <TableHead className="font-bold hidden sm:table-cell">
                      Data
                    </TableHead>
                    <TableHead className="font-bold">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Nenhuma ocorrencia registrada para este setor
                      </TableCell>
                    </TableRow>
                  ) : (
                    complaints.map((complaint) => (
                      <TableRow
                        key={complaint.id}
                        className="hover:bg-muted/30"
                      >
                        <TableCell>
                          <ComplaintStatusBadge
                            status={complaint.status}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {complaint.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell max-w-xs">
                          <p className="text-sm text-foreground truncate">
                            {complaint.content}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                          {new Date(complaint.createdAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDetailSheet({
                                  id: complaint.id,
                                  open: true,
                                })
                              }
                            >
                              Detalhes
                            </Button>
                            {complaint.status !== "RESOLVED" &&
                              complaint.status !== "CLOSED" &&
                              complaint.status !== "CANCELLED" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    handleStatusChange(complaint.id, "RESOLVED")
                                  }
                                >
                                  Resolver
                                </Button>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Complaint Detail Sheet */}
      <ComplaintDetailSheet
        complaintId={detailSheet.id}
        open={detailSheet.open}
        onOpenChange={(open) =>
          setDetailSheet((prev) => ({ ...prev, open }))
        }
      />
    </div>
  );
}
