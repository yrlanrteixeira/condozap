/**
 * Exportação de relatórios agregados para Excel (.xlsx) e PDF (pdfmake + Roboto UTF-8).
 */

import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import type { ReportParams, ReportResponse } from "../hooks/useReportsApi";

pdfMake.vfs = pdfFonts;

const TYPE_LABELS: Record<ReportParams["type"], string> = {
  complaints: "Ocorrências",
  messages: "Mensagens",
  residents: "Moradores",
  satisfaction: "Satisfação",
};

function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Planilha";
}

function recordToMatrix(
  data: Record<string, number> | undefined
): (string | number)[][] {
  if (!data || Object.keys(data).length === 0) {
    return [["Item", "Quantidade"]];
  }
  return [
    ["Item", "Quantidade"],
    ...Object.entries(data).map(([k, v]) => [k, v]),
  ];
}

function buildFilename(
  params: ReportParams,
  ext: "xlsx" | "pdf"
): string {
  return `relatorio-${params.type}-${params.startDate}_a_${params.endDate}.${ext}`;
}

export function exportReportToXlsx(
  report: ReportResponse,
  params: ReportParams
): void {
  const wb = XLSX.utils.book_new();
  const periodLabel = `${params.startDate} a ${params.endDate}`;
  const title = TYPE_LABELS[params.type];

  const cover = [
    ["Relatório", title],
    ["Período", periodLabel],
    [],
  ];

  const addSheetFromAoA = (name: string, aoa: (string | number)[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(name));
  };

  switch (params.type) {
    case "complaints": {
      const d = report.data as {
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
        bySector?: Array<{ name: string; total: number; avgHours: number }>;
      };
      const s = d.summary ?? {};
      addSheetFromAoA("Resumo", [
        ...cover,
        ["Métrica", "Valor"],
        ["Total", s.total ?? 0],
        ["Abertas", s.opened ?? 0],
        ["Resolvidas", s.resolved ?? 0],
        ["Canceladas", s.cancelled ?? 0],
        ["Tempo médio resolução (h)", s.avgResolutionHours ?? 0],
      ]);
      addSheetFromAoA("Por status", recordToMatrix(d.byStatus));
      addSheetFromAoA("Por prioridade", recordToMatrix(d.byPriority));
      addSheetFromAoA("Por categoria", recordToMatrix(d.byCategory));
      if (d.bySector?.length) {
        addSheetFromAoA("Por setor", [
          ["Setor", "Total", "Tempo médio (h)"],
          ...d.bySector.map((x) => [x.name, x.total, x.avgHours]),
        ]);
      }
      break;
    }
    case "satisfaction": {
      const d = report.data as {
        summary?: {
          avgScore?: number;
          totalResponses?: number;
          distribution?: Record<number, number>;
        };
        byCategory?: Array<{
          category: string;
          avgScore: number;
          count: number;
        }>;
      };
      const s = d.summary ?? {};
      const dist = s.distribution ?? {};
      const distRows: (string | number)[][] = [["Estrelas", "Quantidade"]];
      for (let i = 5; i >= 1; i--) {
        distRows.push([`${i}`, dist[i] ?? 0]);
      }
      addSheetFromAoA("Resumo", [
        ...cover,
        ["Métrica", "Valor"],
        ["Nota média", s.avgScore ?? 0],
        ["Total de respostas", s.totalResponses ?? 0],
      ]);
      addSheetFromAoA("Distribuição", distRows);
      if (d.byCategory?.length) {
        addSheetFromAoA("Por categoria", [
          ["Categoria", "Nota média", "Respostas"],
          ...d.byCategory.map((x) => [x.category, x.avgScore, x.count]),
        ]);
      }
      break;
    }
    case "messages": {
      const d = report.data as {
        summary?: {
          total?: number;
          recipients?: number;
          deliveryRate?: number;
        };
        byType?: Record<string, number>;
      };
      const s = d.summary ?? {};
      addSheetFromAoA("Resumo", [
        ...cover,
        ["Métrica", "Valor"],
        ["Total enviadas", s.total ?? 0],
        ["Destinatários", s.recipients ?? 0],
        ["Taxa de entrega (%)", s.deliveryRate ?? 0],
      ]);
      addSheetFromAoA("Por tipo", recordToMatrix(d.byType));
      break;
    }
    case "residents": {
      const d = report.data as {
        summary?: {
          total?: number;
          owners?: number;
          tenants?: number;
          withConsent?: number;
        };
        byTower?: Record<string, number>;
      };
      const s = d.summary ?? {};
      addSheetFromAoA("Resumo", [
        ...cover,
        ["Métrica", "Valor"],
        ["Total", s.total ?? 0],
        ["Proprietários", s.owners ?? 0],
        ["Inquilinos", s.tenants ?? 0],
        ["Com consentimento", s.withConsent ?? 0],
      ]);
      addSheetFromAoA("Por torre", recordToMatrix(d.byTower));
      break;
    }
    default:
      addSheetFromAoA("Resumo", [...cover, ["Dados", "—"]]);
  }

  XLSX.writeFile(wb, buildFilename(params, "xlsx"));
}

function tableBlock(
  title: string,
  headers: TableCell[],
  rows: TableCell[][]
): Content {
  return {
    stack: [
      { text: title, style: "subheader", margin: [0, 12, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: headers.map(() => "*"),
          body: [headers, ...rows],
        },
        layout: "lightHorizontalLines",
      },
    ],
  };
}

export function exportReportToPdf(
  report: ReportResponse,
  params: ReportParams
): void {
  const periodLabel = `${params.startDate} a ${params.endDate}`;
  const title = TYPE_LABELS[params.type];
  const content: Content[] = [
    { text: title, style: "header" },
    { text: `Período: ${periodLabel}`, style: "muted", margin: [0, 0, 0, 16] },
  ];

  const pushKv = (sectionTitle: string, pairs: [string, string | number][]) => {
    content.push(
      tableBlock(
        sectionTitle,
        ["Métrica", "Valor"],
        pairs.map(([a, b]) => [a, String(b)])
      )
    );
  };

  switch (params.type) {
    case "complaints": {
      const d = report.data as {
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
        bySector?: Array<{ name: string; total: number; avgHours: number }>;
      };
      const s = d.summary ?? {};
      pushKv("Resumo", [
        ["Total", s.total ?? 0],
        ["Abertas", s.opened ?? 0],
        ["Resolvidas", s.resolved ?? 0],
        ["Canceladas", s.cancelled ?? 0],
        ["Tempo médio resolução (h)", s.avgResolutionHours ?? 0],
      ]);
      if (d.byStatus && Object.keys(d.byStatus).length) {
        content.push(
          tableBlock(
            "Por status",
            ["Item", "Quantidade"],
            Object.entries(d.byStatus).map(([k, v]) => [k, String(v)])
          )
        );
      }
      if (d.byPriority && Object.keys(d.byPriority).length) {
        content.push(
          tableBlock(
            "Por prioridade",
            ["Item", "Quantidade"],
            Object.entries(d.byPriority).map(([k, v]) => [k, String(v)])
          )
        );
      }
      if (d.byCategory && Object.keys(d.byCategory).length) {
        content.push(
          tableBlock(
            "Por categoria",
            ["Categoria", "Quantidade"],
            Object.entries(d.byCategory).map(([k, v]) => [k, String(v)])
          )
        );
      }
      if (d.bySector?.length) {
        content.push(
          tableBlock(
            "Por setor",
            ["Setor", "Total", "Tempo médio (h)"],
            d.bySector.map((x) => [
              x.name,
              String(x.total),
              String(x.avgHours),
            ])
          )
        );
      }
      break;
    }
    case "satisfaction": {
      const d = report.data as {
        summary?: {
          avgScore?: number;
          totalResponses?: number;
          distribution?: Record<number, number>;
        };
        byCategory?: Array<{
          category: string;
          avgScore: number;
          count: number;
        }>;
      };
      const s = d.summary ?? {};
      const dist = s.distribution ?? {};
      pushKv("Resumo", [
        ["Nota média", s.avgScore ?? 0],
        ["Total de respostas", s.totalResponses ?? 0],
      ]);
      const distRows: TableCell[][] = [];
      for (let i = 5; i >= 1; i--) {
        distRows.push([`${i} estrela(s)`, String(dist[i] ?? 0)]);
      }
      content.push(
        tableBlock("Distribuição por estrelas", ["Estrelas", "Quantidade"], distRows)
      );
      if (d.byCategory?.length) {
        content.push(
          tableBlock(
            "Por categoria",
            ["Categoria", "Nota média", "Respostas"],
            d.byCategory.map((x) => [
              x.category,
              String(x.avgScore),
              String(x.count),
            ])
          )
        );
      }
      break;
    }
    case "messages": {
      const d = report.data as {
        summary?: {
          total?: number;
          recipients?: number;
          deliveryRate?: number;
        };
        byType?: Record<string, number>;
      };
      const s = d.summary ?? {};
      pushKv("Resumo", [
        ["Total enviadas", s.total ?? 0],
        ["Destinatários", s.recipients ?? 0],
        ["Taxa de entrega (%)", s.deliveryRate ?? 0],
      ]);
      if (d.byType && Object.keys(d.byType).length) {
        content.push(
          tableBlock(
            "Por tipo",
            ["Tipo", "Quantidade"],
            Object.entries(d.byType).map(([k, v]) => [k, String(v)])
          )
        );
      }
      break;
    }
    case "residents": {
      const d = report.data as {
        summary?: {
          total?: number;
          owners?: number;
          tenants?: number;
          withConsent?: number;
        };
        byTower?: Record<string, number>;
      };
      const s = d.summary ?? {};
      pushKv("Resumo", [
        ["Total", s.total ?? 0],
        ["Proprietários", s.owners ?? 0],
        ["Inquilinos", s.tenants ?? 0],
        ["Com consentimento", s.withConsent ?? 0],
      ]);
      if (d.byTower && Object.keys(d.byTower).length) {
        content.push(
          tableBlock(
            "Por torre",
            ["Torre", "Quantidade"],
            Object.entries(d.byTower).map(([k, v]) => [k, String(v)])
          )
        );
      }
      break;
    }
    default:
      content.push({ text: "Sem dados para exportar.", style: "muted" });
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 56],
    content,
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
    },
    styles: {
      header: { fontSize: 18, bold: true, color: "#111827" },
      subheader: { fontSize: 12, bold: true, color: "#374151" },
      muted: { fontSize: 10, color: "#6b7280" },
    },
  };

  pdfMake.createPdf(docDefinition).download(buildFilename(params, "pdf"));
}
