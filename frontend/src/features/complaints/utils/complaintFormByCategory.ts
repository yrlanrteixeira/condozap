import { COMPLAINT_CATEGORIES } from "@/config/constants";

export type NormalizedComplaintCategory =
  | (typeof COMPLAINT_CATEGORIES)[number]
  | "OTHER";

/**
 * Alinha categoria vinda dos setores ou digitada com as categorias padrão (acentos ignorados).
 */
export function normalizeComplaintCategory(
  category: string
): NormalizedComplaintCategory {
  const t = category
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  for (const c of COMPLAINT_CATEGORIES) {
    const n = c
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    if (n === t) return c;
  }
  return "OTHER";
}

export type ComplaintFormShape = {
  category: string;
  maintenanceLocation: string;
  maintenanceEquipment: string;
  cleaningArea: string;
  securityType: string;
  noisePeriod: string;
  noiseSource: string;
  parkingInfo: string;
  commonAreaName: string;
  otherSubject: string;
  genericSubject: string;
  details: string;
};

export const defaultComplaintFormValues: ComplaintFormShape = {
  category: "",
  maintenanceLocation: "",
  maintenanceEquipment: "",
  cleaningArea: "",
  securityType: "",
  noisePeriod: "",
  noiseSource: "",
  parkingInfo: "",
  commonAreaName: "",
  otherSubject: "",
  genericSubject: "",
  details: "",
};

/** Monta o texto único enviado à API (sem mudança de contrato no backend). */
export function buildComplaintContent(
  category: string,
  data: ComplaintFormShape
): string {
  const key = normalizeComplaintCategory(category);
  const d = data.details.trim();
  const lines: string[] = [];

  switch (key) {
    case "Manutenção": {
      if (data.maintenanceLocation.trim()) {
        lines.push(`Local: ${data.maintenanceLocation.trim()}`);
      }
      if (data.maintenanceEquipment.trim()) {
        lines.push(`Equipamento/item: ${data.maintenanceEquipment.trim()}`);
      }
      lines.push(`Detalhes: ${d}`);
      break;
    }
    case "Limpeza": {
      lines.push(`Área/local: ${data.cleaningArea.trim()}`);
      lines.push(`Detalhes: ${d}`);
      break;
    }
    case "Segurança": {
      lines.push(`Tipo: ${data.securityType.trim()}`);
      lines.push(`Detalhes: ${d}`);
      break;
    }
    case "Barulho": {
      lines.push(`Período: ${data.noisePeriod.trim()}`);
      if (data.noiseSource.trim()) {
        lines.push(`Origem aproximada: ${data.noiseSource.trim()}`);
      }
      lines.push(`Detalhes: ${d}`);
      break;
    }
    case "Estacionamento": {
      if (data.parkingInfo.trim()) {
        lines.push(`Vaga / veículo: ${data.parkingInfo.trim()}`);
      }
      lines.push(`Detalhes: ${d}`);
      break;
    }
    case "Área Comum": {
      lines.push(`Área: ${data.commonAreaName.trim()}`);
      lines.push(`Detalhes: ${d}`);
      break;
    }
    case "Outros": {
      lines.push(`Resumo: ${data.otherSubject.trim()}`);
      lines.push(`Detalhes: ${d}`);
      break;
    }
    default: {
      lines.push(`Categoria informada: ${category.trim()}`);
      if (data.genericSubject.trim()) {
        lines.push(`Assunto: ${data.genericSubject.trim()}`);
      }
      lines.push(`Detalhes: ${d}`);
    }
  }

  return lines.join("\n");
}
