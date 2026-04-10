/** Dígitos apenas, para comparação consistente (BR / internacional). */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/** Converte para formato WhatsApp (55DXXXXXXXXX ou 55DDXXXXXXXXX) sem duplicar o 55. */
export function toWhatsAppDigits(phone: string): string {
  const d = normalizePhoneDigits(phone);
  // Se já tem 55 e 12-13 dígitos, está no formato correto
  if (d.startsWith("55") && d.length >= 12 && d.length <= 13) {
    return d;
  }
  // Se tem 10-11 dígitos (DDD + número), adicionar 55
  if (d.length >= 10 && d.length <= 11) {
    return `55${d}`;
  }
  // Se tem mais de 13 dígitos, pode ter 55 duplicado - remove até ficar correto
  if (d.length > 13 && d.startsWith("55")) {
    let cleaned = d;
    while (cleaned.length > 13 && cleaned.startsWith("55")) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  }
  return d;
}
