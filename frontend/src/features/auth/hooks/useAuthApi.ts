/**
 * Auth Feature - API Hooks
 */

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LoginInput, RegisterInput, AuthResponse } from '../types'

// =====================================================
// Mutation: Login
// =====================================================

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const { data } = await api.post<AuthResponse>('/auth/login', credentials)
      localStorage.setItem('auth_token', data.token)
      return data
    },
  })
}

// =====================================================
// Mutation: Register
// =====================================================

export function useRegister() {
  return useMutation({
    mutationFn: async (userData: RegisterInput) => {
      const { confirmPassword, ...payload } = userData
      const { data } = await api.post<AuthResponse>('/auth/register', payload)
      localStorage.setItem('auth_token', data.token)
      return data
    },
  })
}

// =====================================================
// Mutation: Logout
// =====================================================

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem('auth_token')
      // Optional: call backend logout endpoint if exists
      // await api.post('/auth/logout')
    },
  })
}

// =====================================================
// Query: Get Current User
// =====================================================

export function useCurrentUser() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/auth/me')
      return data
    },
  })
}


