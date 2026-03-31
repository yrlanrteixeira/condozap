/**
 * Evita duplicar "Torre" quando o nome já vem como "Torre A", "Bloco B", etc.
 */
export function formatTowerHeading(name: string): string {
  const t = name.trim();
  if (!t) return "Torre";
  if (/^torre\s/i.test(t)) return t;
  return `Torre ${t}`;
}

/**
 * Alinha o valor salvo do morador (ex.: "Torre A") ao `value` do Select da estrutura (ex.: "A").
 */
export function resolveTowerValueForSelect(
  stored: string | undefined,
  towerNames: string[]
): string {
  if (!stored?.trim()) return towerNames[0] ?? "";
  const s = stored.trim();
  if (towerNames.includes(s)) return s;
  const stripped = s.replace(/^torre\s+/i, "").trim();
  if (towerNames.includes(stripped)) return stripped;
  for (const t of towerNames) {
    if (formatTowerHeading(t) === s) return t;
  }
  return s;
}
