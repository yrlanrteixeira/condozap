/**
 * API Types
 * Tipos relacionados a comunicação com a API
 */

/**
 * Response padrão da API com paginação
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Response padrão da API
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Error response da API
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Request de paginação
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filtros comuns
 */
export interface BaseFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Status de loading de requisições
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Tipo para query keys do React Query
 */
export type QueryKey = readonly (string | number | boolean | null | undefined)[];


