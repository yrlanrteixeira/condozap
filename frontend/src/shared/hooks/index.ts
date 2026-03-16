/**
 * Global Hooks
 * Redux typed hooks and other global utilities
 */

// Redux Typed Hooks
export { useAppDispatch } from './useAppDispatch';
export { useAppSelector } from './useAppSelector';

// Condominium Sync Hook
export { useCondominiumSync } from './useCondominiumSync';

// Role & Permissions Hooks
export {
  useRole,
  useIsAdmin,
  useIsManagement,
  usePermission,
  useAnyPermission,
  useAllPermissions,
} from './useRole';

export { usePermissions } from './usePermissions';

// Media Query Hooks
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './useMediaQuery';

// API Hooks Factory
export {
  createQuery,
  createMutationWithInvalidation,
  fetchList,
  fetchOne,
  postAndParse,
  patchAndParse,
} from './useApiFactory';