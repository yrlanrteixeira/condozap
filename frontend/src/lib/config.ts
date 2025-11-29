/**
 * Environment Configuration
 * Single Responsibility: Centralize environment variables access
 */

/**
 * Application Configuration
 * Centraliza acesso a variáveis de ambiente
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
} as const;
