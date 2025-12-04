import { z } from 'zod';

/**
 * Schemas de validação para User e Autenticação
 * Inclui validação de email, senha forte e permissões
 */

export const UserRoleEnum = z.enum(['professional_syndic', 'admin', 'syndic', 'resident']);
export const PermissionScopeEnum = z.enum(['global', 'local']);

export const UserSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string()
    .min(3, 'Nome deve ter ao menos 3 caracteres')
    .max(100, 'Nome muito longo'),
  email: z.string()
    .email('Email inválido')
    .toLowerCase(),
  role: UserRoleEnum,
  permissionScope: PermissionScopeEnum,
  condominiumIds: z.array(z.string().cuid()).min(1, 'Usuário deve ter acesso a ao menos um condomínio'),
  residentId: z.string().cuid().optional(),
});

/**
 * Schema para registro de novo usuário
 */
export const RegisterUserSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter ao menos um caractere especial'),
  confirmPassword: z.string(),
  role: UserRoleEnum.default('admin'),
  condominiumId: z.string().cuid('ID do condomínio inválido'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

/**
 * Schema para login
 */
export const LoginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(1, 'Senha obrigatória'),
  mfaCode: z.string().length(6).optional(), // TOTP (Google Authenticator)
});

/**
 * Schema para redefinição de senha
 */
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token inválido'),
  newPassword: z.string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

/**
 * Schema para atualização de perfil
 */
export const UpdateProfileSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().toLowerCase().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine(data => {
  // Se está tentando trocar senha, currentPassword é obrigatória
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Senha atual obrigatória para alterar senha',
  path: ['currentPassword'],
});

/**
 * Schema para setup de MFA (Multi-Factor Authentication)
 */
export const SetupMFASchema = z.object({
  userId: z.string().cuid(),
  mfaCode: z.string().length(6, 'Código TOTP deve ter 6 dígitos'),
});

// Types inferidos
export type UserInput = z.infer<typeof UserSchema>;
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type SetupMFAInput = z.infer<typeof SetupMFASchema>;
