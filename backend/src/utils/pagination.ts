/**
 * Pagination Utilities (OCP - Open/Closed Principle)
 * 
 * Standard pagination helper that can be extended without modification.
 * All list queries use this for consistent pagination.
 * 
 * WHY:
 * - OCP: Easy to add new features (sorting, cursor pagination) without changing existing code
 * - DRY: One place for pagination logic
 * - Consistent API: All endpoints return same pagination format
 */

// ============================================
// Types
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================
// Constants
// ============================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// ============================================
// Helper Functions
// ============================================

/**
 * Normalizes pagination params with defaults and limits
 */
export function normalizePagination(params: PaginationParams): { page: number; limit: number; skip: number } {
  const page = Math.max(1, params.page || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Creates a paginated response from data and total count
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit) || 1;
  
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Returns Prisma query params for pagination
 * Usage: prisma.model.findMany({ ...getPrismaPageParams(page, limit), where: {...} })
 */
export function getPrismaPageParams(params: PaginationParams): { skip: number; take: number } {
  const { skip, limit } = normalizePagination(params);
  return { skip, take: limit };
}

/**
 * Executes paginated query with count
 * 
 * Usage:
 *   const result = await paginatedQuery(
 *     prisma.complaint,
 *     { where: { status: "OPEN" } },
 *     { page: 1, limit: 20 }
 *   );
 */
export async function paginatedQuery<T, W extends { where?: any; include?: any; orderBy?: any }>(
  model: {
    findMany: (args: W & { skip?: number; take?: number }) => Promise<T[]>;
    count: (args: { where?: W["where"] }) => Promise<number>;
  },
  queryArgs: W,
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const { page, limit, skip } = normalizePagination(params);
  
  // Execute both queries in parallel for performance
  const [data, total] = await Promise.all([
    model.findMany({ ...queryArgs, skip, take: limit }),
    model.count({ where: queryArgs.where }),
  ]);
  
  return createPaginatedResponse(data, total, page, limit);
}
