import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/shared/hooks";
import {
  login as loginAction,
  logout as logoutAction,
} from "@/shared/store/slices/authSlice";
import {
  setCondominiums,
  setCurrentCondominium,
  clearCondominiums,
} from "@/shared/store/slices/condominiumSlice";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface SignUpData {
  email: string;
  password: string;
  name: string;
  role?: User["role"];
  condominiumId?: string;
  phone?: string;
  consentDataProcessing?: boolean;
  consentWhatsapp?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthResponse {
  user: User;
  token: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setUser(null);
        return;
      }

      const { data } = await api.get<User>("/auth/me");
      setUser(data);

      // Restaurar condomínios no Redux após refresh
      if (data.condominiums && data.condominiums.length > 0) {
        dispatch(setCondominiums(data.condominiums));

        // Se não houver condomínio selecionado, selecionar o primeiro
        const state = (dispatch as any).getState?.();
        const currentCondoId = state?.condominium?.currentCondominiumId;

        if (!currentCondoId) {
          const firstCondo = data.condominiums[0];
          if (firstCondo) {
            dispatch(setCurrentCondominium(firstCondo.id));
            console.log(
              "🏢 Condomínio restaurado após refresh:",
              firstCondo.name
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      localStorage.removeItem("auth_token");
      setUser(null);
    }
  }, [dispatch]);

  // Initialize auth state
  useEffect(() => {
    fetchCurrentUser().finally(() => setLoading(false));
  }, [fetchCurrentUser]);

  // Sign in
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        // Dispatch Redux login action
        const result = await dispatch(
          loginAction({ email, password })
        ).unwrap();

        // Save to localStorage
        localStorage.setItem("auth_token", result.token);

        // Update local state
        setUser(result.user);

        // Set condominiums in Redux store
        if (result.user.condominiums && result.user.condominiums.length > 0) {
          dispatch(setCondominiums(result.user.condominiums));
          // Automatically select the first condominium
          const firstCondo = result.user.condominiums[0];
          if (firstCondo) {
            dispatch(setCurrentCondominium(firstCondo.id));
            console.log("🏢 Condomínio selecionado:", firstCondo.name);
          }
        }

        navigate("/");
      } catch (error: any) {
        console.error("Error signing in:", error);
        throw new Error(error || "Failed to sign in");
      }
    },
    [navigate, dispatch]
  );

  // Sign up
  const signUp = useCallback(
    async (signUpData: SignUpData) => {
      try {
        const { data } = await api.post<AuthResponse>("/auth/register", {
          email: signUpData.email,
          password: signUpData.password,
          name: signUpData.name,
          role: signUpData.role || "RESIDENT",
          requestedCondominiumId: signUpData.condominiumId,
          requestedPhone: signUpData.phone,
          consentDataProcessing: signUpData.consentDataProcessing ?? false,
          consentWhatsapp: signUpData.consentWhatsapp ?? false,
        });

        localStorage.setItem("auth_token", data.token);
        setUser(data.user);
        navigate("/");
      } catch (error: any) {
        console.error("Error signing up:", error);
        throw new Error(error.response?.data?.error || "Failed to sign up");
      }
    },
    [navigate]
  );

  // Sign out
  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem("auth_token");
      setUser(null);
      dispatch(logoutAction());
      dispatch(clearCondominiums()); // Clear condominium data
      navigate("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [navigate, dispatch]);

  // Update profile
  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      // TODO: Implement update profile endpoint in backend
      console.log("Update profile:", data);
      throw new Error("Not implemented yet");
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
