/**
 * Residents Feature - Public API
 */

// Hooks
export * from './hooks/useResidentsApi';

// Types
export type {
  Resident,
  ResidentType,
  CreateResidentInput,
  UpdateResidentInput,
  ImportResidentsInput,
  UpdateConsentInput,
  ResidentFilters,
} from './types';

// Schemas
export { ResidentSchema, CreateResidentSchema, UpdateResidentSchema } from './schemas';

// Utils
export { queryKeys as residentsQueryKeys } from './utils/queryKeys';

// Components
export * from './components';

