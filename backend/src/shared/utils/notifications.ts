/**
 * WhatsApp Notification Helpers
 *
 * Simple functions to build notification messages
 */

export function buildComplaintCreatedMessage(
  residentName: string,
  complaintId: number,
  category: string,
  priority: string
): string {
  const priorityEmoji = {
    CRITICAL: "🔴",
    HIGH: "🟠",
    MEDIUM: "🟡",
    LOW: "🟢",
  }[priority] || "🟡";

  let message = `📢 *Denúncia Registrada com Sucesso*\n\n`;
  message += `Olá ${residentName}!\n\n`;
  message += `Sua denúncia foi recebida e registrada no sistema.\n\n`;
  message += `🆔 Protocolo: *#${complaintId}*\n`;
  message += `📋 Categoria: ${category}\n`;
  message += `${priorityEmoji} Prioridade: ${priority}\n`;
  message += `📅 Data: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
  message += `Você pode acompanhar o andamento pelo sistema CondoZap.`;

  return message;
}

export function buildComplaintStatusMessage(
  residentName: string,
  complaintId: number,
  category: string,
  status: string,
  notes?: string
): string {
  const statusEmoji = {
    OPEN: "🔵",
    IN_PROGRESS: "🟡",
    RESOLVED: "✅",
  }[status] || "🔵";

  const statusText = {
    OPEN: "Aberta",
    IN_PROGRESS: "Em Andamento",
    RESOLVED: "Resolvida",
  }[status] || status;

  let message = `${statusEmoji} *Atualização da Denúncia #${complaintId}*\n\n`;
  message += `Olá ${residentName}!\n\n`;
  message += `Status alterado para: *${statusText}*\n`;
  message += `Categoria: ${category}\n`;

  if (notes) {
    message += `\n📝 Observação:\n${notes}`;
  }

  if (status === "RESOLVED") {
    message += `\n\n✅ Sua denúncia foi resolvida! Obrigado por utilizar o CondoZap.`;
  }

  return message;
}

export function buildComplaintPriorityMessage(
  residentName: string,
  complaintId: number,
  priority: string
): string {
  const priorityText = {
    CRITICAL: "🔴 Crítica",
    HIGH: "🟠 Alta",
    MEDIUM: "🟡 Média",
    LOW: "🟢 Baixa",
  }[priority] || priority;

  return (
    `Olá ${residentName}! ` +
    `A prioridade da sua denúncia #${complaintId} foi alterada para: *${priorityText}*`
  );
}

export function buildComplaintCommentMessage(
  residentName: string,
  complaintId: number,
  userRole: string,
  comment: string
): string {
  const roleText =
    userRole === "SYNDIC"
      ? "Síndico"
      : userRole === "ADMIN"
      ? "Administrador"
      : "Responsável";

  return (
    `Olá ${residentName}! ` +
    `O ${roleText} adicionou um comentário na sua denúncia #${complaintId}:\n\n` +
    `"${comment}"`
  );
}
