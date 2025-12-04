/**
 * React Query Client Configuration
 * Single Responsibility: Configure and export React Query client with optimal settings
 *
 * Separates concerns:
 * - Client state management (Redux) from server state management (React Query)
 * - Provides automatic caching, background refetching, and retry logic
 */

import { QueryClient, DefaultOptions } from "@tanstack/react-query";

/**
 * Query Configuration
 * Defines default behavior for all queries and mutations
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Window focus refetching - keeps data fresh when user returns
    refetchOnWindowFocus: true,

    // Network reconnection refetching - sync data after offline
    refetchOnReconnect: true,

    // Automatic retry with exponential backoff
    // Attempts: 0ms, 1000ms, 2000ms, 4000ms (max 30s)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Cache duration before data becomes stale (5 minutes)
    staleTime: 5 * 60 * 1000,

    // Garbage collection time - how long to keep unused data (10 minutes)
    gcTime: 10 * 60 * 1000,

    // Refetch on component mount if data is stale
    refetchOnMount: true,
  },

  mutations: {
    // Single retry for mutations to avoid duplicate operations
    retry: 1,
  },
};

/**
 * Query Client Instance
 * Singleton instance used throughout the application
 */
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});
