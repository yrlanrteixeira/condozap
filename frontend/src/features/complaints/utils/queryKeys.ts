/**
 * Complaints Feature - Query Keys
 */

import type { ComplaintFilters } from "../types";

export const queryKeys = {
  all: ["complaints"] as const,
  lists: () => [...queryKeys.all, "list"] as const,
  list: (condominiumId: string, filters?: ComplaintFilters) =>
    [...queryKeys.lists(), condominiumId, filters] as const,
  details: () => [...queryKeys.all, "detail"] as const,
  detail: (id: number) => [...queryKeys.details(), id] as const,
  stats: (condominiumId: string) =>
    [...queryKeys.all, "stats", condominiumId] as const,
};


