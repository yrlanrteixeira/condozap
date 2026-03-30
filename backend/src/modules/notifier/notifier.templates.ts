import type { ComplaintStatus, ComplaintPriority } from "@prisma/client";
import type { NotificationEvent } from "./notifier.types";

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: "Aberta",
  NEW: "Nova",
  TRIAGE: "Triagem",
  IN_PROGRESS: "Em Andamento",
  WAITING_USER: "Aguardando Morador",
  WAITING_THIRD_PARTY: "Aguardando Terceiros",
  RETURNED: "Devolvida",
  REOPENED: "Reaberta",
  RESOLVED: "Resolvida",
  CLOSED: "Fechada",
  CANCELLED: "Cancelada",
};

export const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export interface TemplateResult {
  whatsappMessage: string;
  inAppTitle: string;
  inAppBody: string;
  inAppType: string;
}

export function buildTemplate(event: NotificationEvent): TemplateResult {
  switch (event.type) {
    case "complaint_created":
      return {
        whatsappMessage:
          `✅ Ocorrência #${event.complaintId} registrada!\n\n` +
          `Categoria: ${event.category}\n\n` +
          `Acompanhe o andamento pelo aplicativo.`,
        inAppTitle: "Ocorrência registrada",
        inAppBody: `Sua ocorrência #${event.complaintId} (${event.category}) foi registrada com sucesso.`,
        inAppType: "complaint_status",
      };

    case "complaint_status_changed": {
      const newLabel = STATUS_LABELS[event.newStatus] ?? event.newStatus;
      const oldLabel = STATUS_LABELS[event.oldStatus] ?? event.oldStatus;
      return {
        whatsappMessage:
          `📋 Ocorrência #${event.complaintId} atualizada\n\n` +
          `Novo status: ${newLabel}\n` +
          `Status anterior: ${oldLabel}`,
        inAppTitle: "Status atualizado",
        inAppBody: `Ocorrência #${event.complaintId}: ${oldLabel} → ${newLabel}`,
        inAppType: "complaint_status",
      };
    }

    case "complaint_assigned": {
      const priorityLabel = PRIORITY_LABELS[event.priority] ?? event.priority;
      return {
        whatsappMessage:
          `🔔 Nova ocorrência atribuída a você\n\n` +
          `#${event.complaintId} — ${event.category}\n` +
          `Prioridade: ${priorityLabel}`,
        inAppTitle: "Ocorrência atribuída",
        inAppBody: `A ocorrência #${event.complaintId} (${event.category}, prioridade ${priorityLabel}) foi atribuída a você.`,
        inAppType: "complaint_assigned",
      };
    }

    case "complaint_comment":
      return {
        whatsappMessage:
          `💬 Nova mensagem na ocorrência #${event.complaintId}\n\n` +
          `${event.authorName} adicionou uma mensagem.`,
        inAppTitle: "Nova mensagem",
        inAppBody: `${event.authorName} comentou na ocorrência #${event.complaintId}.`,
        inAppType: "complaint_status",
      };

    case "sla_warning": {
      const slaLabel = event.slaType === "response" ? "resposta" : "resolução";
      return {
        whatsappMessage:
          `⚠️ SLA em risco - Ocorrência #${event.complaintId}\n\n` +
          `O prazo de ${slaLabel} vence em ${event.minutesRemaining} minuto(s).`,
        inAppTitle: "SLA em risco",
        inAppBody: `Ocorrência #${event.complaintId}: prazo de ${slaLabel} vence em ${event.minutesRemaining} minuto(s).`,
        inAppType: "sla_warning",
      };
    }

    case "sla_escalation": {
      const priorityLabel = PRIORITY_LABELS[event.priority] ?? event.priority;
      return {
        whatsappMessage:
          `🚨 SLA violado - Ocorrência #${event.complaintId}\n\n` +
          `Categoria: ${event.category}\n` +
          `Prioridade: ${priorityLabel}`,
        inAppTitle: "SLA violado",
        inAppBody: `Ocorrência #${event.complaintId} (${event.category}, prioridade ${priorityLabel}) ultrapassou o prazo do SLA.`,
        inAppType: "sla_warning",
      };
    }

    case "csat_request":
      return {
        whatsappMessage:
          `Como foi o atendimento da ocorrência #${event.complaintId}?\n` +
          `Responda 1-5 (1 = Muito ruim, 5 = Excelente)`,
        inAppTitle: "Avalie o atendimento",
        inAppBody: `Como você avalia o atendimento da ocorrência #${event.complaintId}? Responda 1-5.`,
        inAppType: "csat_request",
      };

    case "approval_pending":
      return {
        whatsappMessage:
          `📋 Novo cadastro pendente!\n\n` +
          `${event.userName} solicitou acesso ao condomínio ${event.condominiumName}.`,
        inAppTitle: "Cadastro pendente",
        inAppBody: `${event.userName} está aguardando aprovação para o condomínio ${event.condominiumName}.`,
        inAppType: "approval_pending",
      };
  }
}
