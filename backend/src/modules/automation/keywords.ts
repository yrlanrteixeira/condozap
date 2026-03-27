import type { ComplaintPriority } from "@prisma/client";

export const PRIORITY_KEYWORDS: Record<string, ComplaintPriority> = {};

const CRITICAL_WORDS = [
  "incêndio", "vazamento", "inundação", "desabamento",
  "gás", "curto-circuito", "emergência", "alagamento",
];
const HIGH_WORDS = [
  "elevador", "portão", "segurança", "furto",
  "roubo", "alarme", "queda de energia",
];

for (const w of CRITICAL_WORDS) PRIORITY_KEYWORDS[w] = "CRITICAL";
for (const w of HIGH_WORDS) PRIORITY_KEYWORDS[w] = "HIGH";

export function detectPriority(content: string): ComplaintPriority | null {
  const lower = content.toLowerCase();
  for (const [keyword, priority] of Object.entries(PRIORITY_KEYWORDS)) {
    if (lower.includes(keyword)) return priority;
  }
  return null;
}
