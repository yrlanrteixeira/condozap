import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, role?: User['role']) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthResponse {
  user: User
  token: string
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setUser(null)
        return
      }

      const { data } = await api.get<User>('/auth/me')
      setUser(data)
    } catch (error) {
      console.error('Error fetching current user:', error)
      localStorage.removeItem('auth_token')
      setUser(null)
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    fetchCurrentUser().finally(() => setLoading(false))
  }, [fetchCurrentUser])

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      })

      localStorage.setItem('auth_token', data.token)
      setUser(data.user)
      navigate('/')
    } catch (error: any) {
      console.error('Error signing in:', error)
      throw new Error(error.response?.data?.error || 'Failed to sign in')
    }
  }, [navigate])

  // Sign up
  const signUp = useCallback(async (
    email: string,
    password: string,
    name: string,
    role?: User['role']
  ) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
        name,
        role: role || 'RESIDENT',
      })

      localStorage.setItem('auth_token', data.token)
      setUser(data.user)
      navigate('/')
    } catch (error: any) {
      console.error('Error signing up:', error)
      throw new Error(error.response?.data?.error || 'Failed to sign up')
    }
  }, [navigate])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem('auth_token')
      setUser(null)
      navigate('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [navigate])

  // Update profile
  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      // TODO: Implement update profile endpoint in backend
      console.log('Update profile:', data)
      throw new Error('Not implemented yet')
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
