import type { Resident } from "@/features/residents/types";
import type { TargetData } from "@/features/messages/types";
import type { Complaint, ComplaintStatus } from "@/features/complaints/types";

// Filter residents by target
export function filterResidentsByTarget(
  residents: Resident[],
  targetData: TargetData
): Resident[] {
  // Filtrar apenas moradores com consentimento de WhatsApp
  const residentsWithConsent = residents.filter((r) => r.consentWhatsapp);

  switch (targetData.scope) {
    case "ALL":
      return residentsWithConsent;
    case "TOWER":
      return residentsWithConsent.filter((r) => r.tower === targetData.tower);
    case "FLOOR":
      return residentsWithConsent.filter(
        (r) => r.tower === targetData.tower && r.floor === targetData.floor
      );
    case "UNIT":
      return residentsWithConsent.filter(
        (r) => 
          r.tower === targetData.tower && 
          r.floor === targetData.floor && 
          r.unit === targetData.unit
      );
    default:
      return residentsWithConsent;
  }
}

// Get status update message for complaints
export function getComplaintStatusMessage(
  complaint: Complaint,
  newStatus: ComplaintStatus
): string {
  switch (newStatus) {
    case "IN_PROGRESS":
      return `Olá. Sua denúncia sobre "${complaint.category}" foi recebida e já está em análise pelo síndico/ronda.`;
    case "RESOLVED":
      return `Olá. Boas notícias! A denúncia sobre "${complaint.category}" foi finalizada/resolvida.`;
    case "OPEN":
      return `Sua denúncia sobre "${complaint.category}" foi reaberta para análise.`;
    default:
      return "";
  }
}

// Validate complaint status transition
export function canTransitionStatus(
  currentStatus: ComplaintStatus,
  newStatus: ComplaintStatus
): boolean {
  const transitions: Record<ComplaintStatus, ComplaintStatus[]> = {
    OPEN: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED", "OPEN"],
    RESOLVED: [],
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
}

// Note: generateId moved to utils/constants.ts as generateUniqueId()
// This file kept for other helper functions

// Safe date formatting functions
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "Data inválida";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return "Data inválida";
    }

    return dateObj.toLocaleDateString("pt-BR");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Data inválida";
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "Data inválida";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return "Data inválida";
    }

    const dateStr = dateObj.toLocaleDateString("pt-BR");
    const timeStr = dateObj.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dateStr} às ${timeStr}`;
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "Data inválida";
  }
}
