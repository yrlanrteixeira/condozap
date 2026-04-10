/** Dígitos apenas, para comparação consistente (BR / internacional). */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Converte para formato WhatsApp (55DXXXXXXXXX ou 55DDXXXXXXXXX) sem duplicar o 55.
 * Lida com o caso especial do DDD brasileiro 55 (ex: Rio Grande do Sul).
 */
export function toWhatsAppDigits(phone: string): string {
  let d = normalizePhoneDigits(phone);

  // Remove leading zeros if it results in a standard BR size (10, 11)
  if (d.startsWith("0")) {
    const withoutZeros = d.replace(/^0+/, "");
    if (withoutZeros.length >= 10 && withoutZeros.length <= 11) {
      d = withoutZeros;
    }
  }

  // Remove duplicate 55 prefixes ONLY if length goes beyond normal max (13)
  while (d.length > 13 && d.startsWith("5555")) {
    d = d.substring(2);
  }

  // Já começou com 55 e tem tamanho suficiente para Brasil
  if (d.startsWith("55") && d.length >= 12) {
    return d;
  }

  // Sem código do pais mas com tamanho Brasil
  if ((d.length >= 10 && d.length <= 12) && !d.startsWith("55")) {
    return `55${d}`;
  }

  // Fallback
  return d;
}
