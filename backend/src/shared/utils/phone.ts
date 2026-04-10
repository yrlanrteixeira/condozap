/** Dígitos apenas, para comparação consistente (BR / internacional). */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Converte para formato WhatsApp (55DXXXXXXXXX ou 55DDXXXXXXXXX) sem duplicar o 55.
 * Lida com o caso especial do DDD brasileiro 55 (ex: Rio Grande do Sul).
 */
export function toWhatsAppDigits(phone: string): string {
  const d = normalizePhoneDigits(phone);
  
  // Já tem 55 e está no formato correto (12-13 dígitos = código país + DDD + número)
  if (d.startsWith("55") && d.length >= 12 && d.length <= 13) {
    // Pode ter 55 duplicado (ex: 5551...), verifica se após remover um 55 ainda tem DDD válido
    if (d.length > 12) {
      const withoutFirst55 = d.substring(2);
      // Se o que sobra começa com 55, tem duplicação
      if (withoutFirst55.startsWith("55")) {
        const cleaned = withoutFirst55.substring(2);
        // Agora deve ter 10-11 dígitos
        if (cleaned.length >= 10 && cleaned.length <= 11) {
          return `55${cleaned}`;
        }
      }
    }
    return d;
  }
  
  // Tem 10-11 dígitos (apenas DDD + número, sem código do país)
  // Este é o caso padrão: adicionar 55
  if (d.length >= 10 && d.length <= 11) {
    return `55${d}`;
  }
  
  // Tem mais de 13 dígitos - remoção de 55 duplicado
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
  
  // Fallback: retorna o que tiver
  return d;
}
