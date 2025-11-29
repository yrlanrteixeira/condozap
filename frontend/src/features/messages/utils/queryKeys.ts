/**
 * Messages Feature - Query Keys
 */

import type { MessageFilters, MessageStatsPeriod } from "../types";

export const queryKeys = {
  all: ["messages"] as const,
  lists: () => [...queryKeys.all, "list"] as const,
  list: (condominiumId: string, filters?: MessageFilters) =>
    [...queryKeys.lists(), condominiumId, filters] as const,
  details: () => [...queryKeys.all, "detail"] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  stats: (condominiumId: string, period?: MessageStatsPeriod) =>
    [...queryKeys.all, "stats", condominiumId, period] as const,
};


