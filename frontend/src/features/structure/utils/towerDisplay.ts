/**
 * Evita duplicar "Torre" quando o nome já vem como "Torre A", "Bloco B", etc.
 */
export function formatTowerHeading(name: string): string {
  const t = name.trim();
  if (!t) return "Torre";
  if (/^torre\s/i.test(t)) return t;
  return `Torre ${t}`;
}
