import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role?: User['role']) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user profile from public.users table
  const fetchUserProfile = useCallback(async (authUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_condominiums (
            condominium_id
          )
        `)
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      // Transform to User type
      const userProfile: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        permissionScope: data.permission_scope,
        condominiumIds: data.user_condominiums?.map((uc: any) => uc.condominium_id) || [],
        residentId: data.resident_id,
      };

      return userProfile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);

      if (initialSession?.user) {
        const profile = await fetchUserProfile(initialSession.user);
        setUser(profile);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (newSession?.user) {
          const profile = await fetchUserProfile(newSession.user);
          setUser(profile);
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profile = await fetchUserProfile(data.user);
        setUser(profile);
        setSession(data.session);

        // Update last_login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);

        navigate('/');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, navigate]);

  // Sign up
  const signUp = useCallback(async (
    email: string,
    password: string,
    name: string,
    role: User['role'] = 'admin'
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Profile is created automatically by trigger
        // Redirect to email confirmation page
        navigate('/auth/check-email');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Sign out
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
      navigate('/auth/login');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Erro ao sair');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Update profile
  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: data.name,
          role: data.role,
          permission_scope: data.permissionScope,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refetch profile
      const updatedProfile = await fetchUserProfile({ id: user.id } as SupabaseUser);
      if (updatedProfile) {
        setUser(updatedProfile);
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserProfile]);

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
