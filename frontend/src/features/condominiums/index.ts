/**
 * Condominiums Feature
 */

export { CondominiumsPage } from './pages/CondominiumsPage';
export { CondominiumCard, CondominiumForm } from './components';
export {
  useCondominiums,
  useCondominium,
  useCondominiumStats,
  useCreateCondominium,
  useUpdateCondominium,
  useDeleteCondominium,
} from './hooks/useCondominiumsApi';
export type {
  Condominium,
  CondominiumStatus,
  CreateCondominiumInput,
  UpdateCondominiumInput,
  CondominiumStats,
} from './types';

