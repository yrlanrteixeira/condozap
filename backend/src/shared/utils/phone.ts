/** Dígitos apenas, para comparação consistente (BR / internacional). */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}
