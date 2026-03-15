/**
 * Auth Feature - API Hooks
 */

import { useMutation, useQuery } from '@tanstack/react-query'
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
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken)
      }
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
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken)
      }
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
      try {
        await api.post('/auth/logout')
      } catch {
        // Ignora erro do backend - logout local continua
      }
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
    },
  })
}

// =====================================================
// Query: Get Current User
// =====================================================

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data
    },
    enabled: !!localStorage.getItem('auth_token'),
  })
}


