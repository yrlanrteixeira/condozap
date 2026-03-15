/**
 * Auth Feature - Type Definitions
 */

export type UserRole = 'SUPER_ADMIN' | 'PROFESSIONAL_SYNDIC' | 'ADMIN' | 'SYNDIC' | 'RESIDENT'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  permissionScope: 'GLOBAL' | 'LOCAL'
  createdAt: string
  condominiums?: Array<{
    id: string
    name: string
    role: UserRole
  }>
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  confirmPassword: string
  role?: UserRole
}

export interface AuthResponse {
  user: User
  token: string
}


