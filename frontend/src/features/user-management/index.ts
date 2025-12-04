export { TeamManagementPage } from './pages/TeamManagementPage';
export { CreateAdminDialog } from './components/CreateAdminDialog';
export { 
  useCondominiumUsers, 
  useCreateAdmin, 
  useUpdateUserRole, 
  useRemoveUser,
  useInviteUser,
} from './hooks/useUserManagementApi';
export type { CondominiumUser, CreateAdminInput, UpdateUserRoleInput, RemoveUserInput, InviteUserInput } from './types';

