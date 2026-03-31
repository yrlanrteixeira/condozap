import { useState } from "react";
import { FileBarChart, Download, Calendar, Search, Loader2, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useAppSelector } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import {
  useReport,
  downloadReportCsv,
  type ReportType,
  type ReportParams,
} from "../hooks/useReportsApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { exportReportToPdf, exportReportToXlsx } from "../utils/exportReport";

// ---------------------------------------------------------------------------
// Type helpers for each report shape
// ---------------------------------------------------------------------------

interface ComplaintsData {
  summary?: {
    total?: number;
    opened?: number;
    resolved?: number;
    cancelled?: number;
    avgResolutionHours?: number;
  };
  byStatus?: Record<string, number>;
  byPriority?: Record<string, number>;
  byCategory?: Record<string, number>;
}

interface SatisfactionData {
  summary?: {
    avgScore?: number;
    totalResponses?: number;
    distribution?: Record<number, number>;
  };
  byCategory?: Array<{ category: string; avgScore: number; count: number }>;
}

interface MessagesData {
  summary?: {
    total?: number;
    recipients?: number;
    deliveryRate?: number;
  };
  byType?: Record<string, number>;
}

interface ResidentsData {
  summary?: {
    total?: number;
    owners?: number;
    tenants?: number;
    withConsent?: number;
  };
  byTower?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Sub-components for each report type
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </h3>
  );
}

function RecordTable({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Sem dados</p>;
  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between text-sm">
          <span className="text-foreground capitalize">{key}</span>
          <Badge variant="secondary">{value}</Badge>
        </div>
      ))}
    </div>
  );
}

function ComplaintsReport({ data }: { data: ComplaintsData }) {
  const s = data.summary ?? {};
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatBox label="Total" value={s.total ?? 0} />
            <StatBox label="Abertas" value={s.opened ?? 0} />
            <StatBox label="Resolvidas" value={s.resolved ?? 0} />
            <StatBox label="Canceladas" value={s.cancelled ?? 0} />
            <StatBox
              label="Tempo médio (horas)"
              value={s.avgResolutionHours !== undefined ? String(s.avgResolutionHours) : "—"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <SectionTitle>Por Status</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecordTable data={(data.byStatus ?? {}) as Record<string, number>} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <SectionTitle>Por Prioridade</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecordTable data={(data.byPriority ?? {}) as Record<string, number>} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <SectionTitle>Por Categoria</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecordTable data={(data.byCategory ?? {}) as Record<string, number>} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SatisfactionReport({ data }: { data: SatisfactionData }) {
  const s = data.summary ?? {};
  const dist = s.distribution ?? {};
  const byCategoryList = data.byCategory ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Nota média" value={s.avgScore !== undefined ? String(s.avgScore) : "—"} />
            <StatBox label="Total respostas" value={s.totalResponses ?? 0} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <SectionTitle>Distribuição por estrelas</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{star} estrela{star !== 1 ? "s" : ""}</span>
                  <Badge variant="secondary">{dist[star] ?? 0}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              <SectionTitle>Por Categoria</SectionTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byCategoryList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {byCategoryList.map((row) => (
                  <div
                    key={row.category}
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <span className="text-foreground">{row.category}</span>
                    <span className="text-muted-foreground text-xs">
                      média {row.avgScore} · {row.count} resposta(s)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MessagesReport({ data }: { data: MessagesData }) {
  const s = data.summary ?? {};
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatBox label="Total enviadas" value={s.total ?? 0} />
            <StatBox label="Destinatários" value={s.recipients ?? 0} />
            <StatBox
              label="Taxa de entrega"
              value={s.deliveryRate !== undefined ? `${s.deliveryRate}%` : "—"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordTable data={(data.byType ?? {}) as Record<string, number>} />
        </CardContent>
      </Card>
    </div>
  );
}

function ResidentsReport({ data }: { data: ResidentsData }) {
  const s = data.summary ?? {};
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBox label="Total" value={s.total ?? 0} />
            <StatBox label="Proprietários" value={s.owners ?? 0} />
            <StatBox label="Inquilinos" value={s.tenants ?? 0} />
            <StatBox label="Com consentimento" value={s.withConsent ?? 0} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por Torre</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordTable data={(data.byTower ?? {}) as Record<string, number>} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "complaints", label: "Ocorrências" },
  { value: "messages", label: "Mensagens" },
  { value: "residents", label: "Moradores" },
  { value: "satisfaction", label: "Satisfação" },
];

export function ReportsPage() {
  const condominiumId = useAppSelector(selectCurrentCondominiumId) ?? "";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState<ReportType>("complaints");
  const [activeParams, setActiveParams] = useState<ReportParams | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: report, isLoading, isError } = useReport(condominiumId, activeParams);

  const handleGenerate = () => {
    if (!startDate || !endDate) return;
    setActiveParams({ startDate, endDate, type: reportType });
  };

  const handleExportCsv = async () => {
    if (!activeParams || !condominiumId) return;
    setIsDownloading(true);
    try {
      await downloadReportCsv(condominiumId, activeParams);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportXlsx = () => {
    if (!report || !activeParams) return;
    exportReportToXlsx(report, activeParams);
  };

  const handleExportPdf = () => {
    if (!report || !activeParams) return;
    exportReportToPdf(report, activeParams);
  };

  const renderReportData = () => {
    if (!activeParams) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <FileBarChart className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">Nenhum relatório selecionado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione o período e tipo de relatório e clique em "Gerar Relatório"
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (isError || !report) {
      return (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Erro ao carregar o relatório. Tente novamente.
            </p>
          </CardContent>
        </Card>
      );
    }

    const d = report.data;

    switch (activeParams.type) {
      case "complaints":
        return <ComplaintsReport data={d as ComplaintsData} />;
      case "satisfaction":
        return <SatisfactionReport data={d as SatisfactionData} />;
      case "messages":
        return <MessagesReport data={d as MessagesData} />;
      case "residents":
        return <ResidentsReport data={d as ResidentsData} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileBarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Gere relatórios detalhados do condomínio por período e tipo
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Start date */}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Data inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* End date */}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Data final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Report type */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">
                Tipo de relatório
              </label>
              <Select
                value={reportType}
                onValueChange={(v) => setReportType(v as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 ml-auto mt-auto">
              <Button
                onClick={handleGenerate}
                disabled={!startDate || !endDate || !condominiumId}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Gerar Relatório
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!report || isDownloading || !condominiumId}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {isDownloading ? "Exportando..." : "Exportar"}
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => void handleExportCsv()}>
                    <Download className="mr-2 h-4 w-4" />
                    CSV (UTF-8, linhas detalhadas)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportXlsx}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel (.xlsx) — resumo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF — resumo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report data */}
      {renderReportData()}
    </div>
  );
}

export default ReportsPage;
