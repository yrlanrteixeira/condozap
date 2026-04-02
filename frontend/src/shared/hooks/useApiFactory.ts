/**
 * API Hooks Factory
 *
 * Provides factory functions to reduce boilerplate when creating
 * React Query hooks for standard CRUD operations.
 *
 * Usage:
 *   const useItems = createQuery({ ... })
 *   const useCreateItem = createMutationWithInvalidation({ ... })
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// createQuery: Factory for GET-based query hooks
// ---------------------------------------------------------------------------

type SchemaLike<T> = { parse: (data: unknown) => T };

interface CreateQueryConfig<TData, TArgs extends unknown[]> {
  /** Build the query key from the hook arguments */
  queryKey: (...args: TArgs) => QueryKey;
  /** Build the endpoint URL from the hook arguments */
  queryFn: (...args: TArgs) => Promise<TData>;
  /** Return false to disable the query (maps to `enabled`) */
  enabled?: (...args: TArgs) => boolean;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
  /** Override window-focus refetch behavior for this query */
  refetchOnWindowFocus?: boolean;
  /** Override reconnection refetch behavior for this query */
  refetchOnReconnect?: boolean;
  /** Override mount refetch behavior for this query */
  refetchOnMount?: boolean;
}

/**
 * Creates a reusable query hook.
 *
 * @example
 * const useCondominium = createQuery({
 *   queryKey: (id: string) => queryKeys.detail(id),
 *   queryFn: async (id: string) => {
 *     const { data } = await api.get(`/condominiums/${id}`);
 *     return data;
 *   },
 *   enabled: (id) => !!id,
 * });
 */
export function createQuery<TData, TArgs extends unknown[]>(
  config: CreateQueryConfig<TData, TArgs>
) {
  return (...args: TArgs) => {
    return useQuery({
      queryKey: config.queryKey(...args),
      queryFn: () => config.queryFn(...args),
      enabled: config.enabled ? config.enabled(...args) : undefined,
      staleTime: config.staleTime,
      refetchInterval: config.refetchInterval,
      refetchOnWindowFocus: config.refetchOnWindowFocus,
      refetchOnReconnect: config.refetchOnReconnect,
      refetchOnMount: config.refetchOnMount,
    });
  };
}

// ---------------------------------------------------------------------------
// createMutationWithInvalidation: Factory for mutation hooks that invalidate
// ---------------------------------------------------------------------------

interface CreateMutationConfig<TInput, TOutput> {
  /** The mutation function (api call) */
  mutationFn: (input: TInput) => Promise<TOutput>;
  /**
   * Return query keys to invalidate after a successful mutation.
   * Receives both the mutation output and the input variables.
   */
  invalidateKeys?: (data: TOutput, variables: TInput) => QueryKey[];
  /** Additional react-query mutation options */
  options?: Omit<
    UseMutationOptions<TOutput, Error, TInput>,
    "mutationFn" | "onSuccess"
  >;
}

/**
 * Creates a reusable mutation hook that auto-invalidates query keys on success.
 *
 * @example
 * const useDeleteItem = createMutationWithInvalidation({
 *   mutationFn: async (id: string) => { await api.delete(`/items/${id}`); },
 *   invalidateKeys: () => [queryKeys.lists()],
 * });
 */
export function createMutationWithInvalidation<TInput, TOutput = void>(
  config: CreateMutationConfig<TInput, TOutput>
) {
  return () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: config.mutationFn,
      onSuccess: (data, variables) => {
        if (config.invalidateKeys) {
          const keys = config.invalidateKeys(data, variables);
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      },
      ...config.options,
    });
  };
}

// ---------------------------------------------------------------------------
// Helpers: Common patterns for schema parsing
// ---------------------------------------------------------------------------

/**
 * Fetches a list from an endpoint and parses each item with a Zod schema.
 */
export async function fetchList<T>(
  endpoint: string,
  schema: SchemaLike<T>,
  params?: Record<string, unknown>
): Promise<T[]> {
  const { data } = await api.get(endpoint, { params });
  return data.map((item: unknown) => schema.parse(item));
}

/**
 * Fetches a single item from an endpoint and parses it with a Zod schema.
 */
export async function fetchOne<T>(
  endpoint: string,
  schema: SchemaLike<T>
): Promise<T> {
  const { data } = await api.get(endpoint);
  return schema.parse(data);
}

/**
 * Posts data to an endpoint and parses the response with a Zod schema.
 */
export async function postAndParse<T>(
  endpoint: string,
  input: unknown,
  schema: SchemaLike<T>
): Promise<T> {
  const { data } = await api.post(endpoint, input);
  return schema.parse(data);
}

/**
 * Patches data to an endpoint and parses the response with a Zod schema.
 */
export async function patchAndParse<T>(
  endpoint: string,
  input: unknown,
  schema: SchemaLike<T>
): Promise<T> {
  const { data } = await api.patch(endpoint, input);
  return schema.parse(data);
}
