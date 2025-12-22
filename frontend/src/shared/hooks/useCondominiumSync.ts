/**
 * Hook to sync React Query cache when condominium changes
 *
 * This hook observes changes to the selected condominium in Redux
 * and invalidates all relevant queries to ensure data is refreshed
 * across the entire application.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from './useAppSelector';
import { selectCurrentCondominiumId } from '@/shared/store/slices/condominiumSlice';

export function useCondominiumSync() {
  const queryClient = useQueryClient();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const previousCondominiumId = useRef<string | null>(null);

  useEffect(() => {
    // Skip on initial mount
    if (previousCondominiumId.current === null) {
      previousCondominiumId.current = currentCondominiumId;
      return;
    }

    // Only invalidate if condominium actually changed
    if (previousCondominiumId.current !== currentCondominiumId) {
      console.log(
        '🏢 Condomínio alterado:',
        previousCondominiumId.current,
        '→',
        currentCondominiumId
      );

      // Invalidate all data-related queries
      // This forces refetch with the new condominium ID
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      console.log('✅ Queries invalidadas - dados serão atualizados');

      // Update ref for next comparison
      previousCondominiumId.current = currentCondominiumId;
    }
  }, [currentCondominiumId, queryClient]);
}
