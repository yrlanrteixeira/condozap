/**
 * Dashboard Feature - Query Keys
 */

export const queryKeys = {
  all: ["dashboard"] as const,
  metrics: (condominiumId: string) =>
    [...queryKeys.all, "metrics", condominiumId] as const,
  unified: (condominiumIds: string[]) =>
    [...queryKeys.all, "unified", condominiumIds] as const,
};


