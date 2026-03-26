/**
 * Environment Configuration
 * Single Responsibility: Centralize environment variables access
 */

/**
 * Garante URL absoluta com esquema. Sem `https://`, valores como
 * `api.exemplo.com/api` viram caminho relativo ao origin do front e quebram
 * (ex.: `https://app.exemplo.com/api.exemplo.com/api/...`).
 */
function normalizeApiBaseUrl(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return t;
  const hostPart = t.split("/")[0]?.toLowerCase() ?? "";
  if (hostPart.startsWith("localhost")) return `http://${t}`;
  if (hostPart.includes(".")) return `https://${t}`;
  return t;
}

const rawApiUrl =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/**
 * Application Configuration
 * Centraliza acesso a variáveis de ambiente
 */
export const config = {
  apiUrl: normalizeApiBaseUrl(rawApiUrl),
} as const;
