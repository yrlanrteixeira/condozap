/**
 * Complaints Feature - Public API
 */

// Hooks
export * from './hooks/useComplaintsApi';

// Types
export type {
  Complaint,
  ComplaintStatus,
  ComplaintPriority,
  CreateComplaintInput,
  UpdateComplaintInput,
  ComplaintFilters,
  ComplaintAttachment,
  ComplaintStatusHistory,
  ComplaintStats,
} from './types';

// Schemas
export { ComplaintSchema, CreateComplaintSchema, UpdateComplaintSchema } from './schemas';

// Utils
export { queryKeys as complaintsQueryKeys } from './utils/queryKeys';

// Components
export * from './components';

// Pages
export { ComplaintsPage } from './pages/ComplaintsPage';
export { AdminComplaintsKanbanPage } from './pages/AdminComplaintsKanbanPage';
export { AdminComplaintsTablePage } from './pages/AdminComplaintsTablePage';
export { ResidentComplaintsPage } from './pages/ResidentComplaintsPage';
