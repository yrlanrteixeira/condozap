/**
 * Barrel export for all API hooks
 * Provides centralized access to React Query hooks
 */

// Complaints API
export {
  useComplaints,
  useComplaint,
  useCreateComplaint,
  useUpdateComplaintStatus,
  useUpdateComplaintPriority,
  useDeleteComplaint,
} from './useComplaintsApi'

// Residents API
export {
  useResidents,
  useResident,
  useTowers,
  useCreateResident,
  useUpdateResident,
  useDeleteResident,
  useImportResidents,
  useUpdateConsent,
} from './useResidentsApi'

// Messages API
export {
  useMessages,
  useMessage,
  useSendWhatsAppMessage,
  useSendBulkMessages,
  useSendMessage,
  useMessageStats,
} from './useMessagesApi'

// Dashboard API
export {
  useDashboardMetrics,
  useUnifiedDashboard,
} from './useDashboardApi'
