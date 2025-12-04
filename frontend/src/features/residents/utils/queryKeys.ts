/**
 * Residents Feature - Query Keys
 */

import type { ResidentFilters } from "../types";

export const queryKeys = {
  all: ["residents"] as const,
  lists: () => [...queryKeys.all, "list"] as const,
  list: (condominiumId: string, filters?: ResidentFilters) =>
    [...queryKeys.lists(), condominiumId, filters] as const,
  details: () => [...queryKeys.all, "detail"] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  towers: (condominiumId: string) =>
    [...queryKeys.all, "towers", condominiumId] as const,
};


