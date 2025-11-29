/**
 * Global Hooks
 * Redux typed hooks and other global utilities
 */

// Redux Typed Hooks
export { useAppDispatch } from './useAppDispatch';
export { useAppSelector } from './useAppSelector';

// Role & Permissions Hooks
export {
  useRole,
  useIsAdmin,
  useIsManagement,
  usePermission,
  useAnyPermission,
  useAllPermissions,
} from './useRole';
