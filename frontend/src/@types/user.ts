/**
 * User & Authentication Types
 * Tipos centralizados para usuário e autenticação
 */

/**
 * Roles de usuário no sistema TalkZap
 * - SUPER_ADMIN: Acesso total ao sistema (múltiplos condomínios)
 * - PROFESSIONAL_SYNDIC: Síndico profissional (gerencia múltiplos condomínios)
 * - ADMIN: Administrador de condomínio
 * - SYNDIC: Síndico de condomínio
 * - RESIDENT: Morador
 */
export type UserRole =
  | "SUPER_ADMIN"
  | "PROFESSIONAL_SYNDIC"
  | "ADMIN"
  | "SYNDIC"
  | "RESIDENT";

/**
 * Escopo de permissão do usuário
 * - GLOBAL: Acesso a múltiplos condomínios
 * - LOCAL: Acesso limitado a condomínio(s) específico(s)
 */
export type PermissionScope = "GLOBAL" | "LOCAL";

/**
 * Informações de um condomínio
 */
export interface Condominium {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
}

/**
 * Usuário do sistema
 */
/**
 * Status de aprovação do usuário
 */
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissionScope: PermissionScope;
  status?: UserStatus; // Status de aprovação do usuário
  condominiums?: Condominium[]; // Lista de condomínios que o usuário tem acesso
  currentCondominiumId?: string; // ID do condomínio ativo no momento
  residentId?: string; // ID do cadastro de morador (para role RESIDENT)
  consentWhatsapp?: boolean;
  consentDataProcessing?: boolean;
}

/**
 * Request de login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response de login
 */
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

/**
 * Response de refresh token
 */
export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

/**
 * Estado de autenticação no Redux
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokenExpiresAt: number | null; // Timestamp em ms de quando o token expira
  error: string | null;
}

/**
 * Request de registro de novo usuário
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  condominiumId: string;
}

/**
 * Response de registro
 */
export interface RegisterResponse {
  message: string;
  userId: string;
}

/**
 * Request de redefinição de senha
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Request de recuperação de senha (envio de email)
 */
export interface ForgotPasswordRequest {
  email: string;
}

