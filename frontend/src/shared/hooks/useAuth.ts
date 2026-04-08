import { useCallback } from "react";
import { useAppSelector } from "./useAppSelector";
import { useAppDispatch } from "./useAppDispatch";
import {
  login as loginAction,
  register as registerAction,
  logout as logoutAction,
  updateProfile as updateProfileAction,
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectUserRole,
} from "@/shared/store/slices/authSlice";
import {
  setCondominiums,
  setCurrentCondominium,
  clearCondominiums,
} from "@/shared/store/slices/condominiumSlice";
import { store, type RootState } from "@/shared/store";
import { api } from "@/lib/api";
import type { LoginRequest, Condominium } from "@/types/user";
import type { User } from "@/types";

/**
 * Hook unificado de autenticacao (Redux-based).
 * Substitui o AuthContext — fonte unica de verdade para auth.
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const userRole = useAppSelector(selectUserRole);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      return dispatch(loginAction(credentials)).unwrap();
    },
    [dispatch]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await dispatch(loginAction({ email, password })).unwrap();

      if (result.user.condominiums && result.user.condominiums.length > 0) {
        dispatch(setCondominiums(result.user.condominiums));
        const state = store.getState() as RootState;
        const currentCondoId = state?.condominium?.currentCondominiumId;
        const ids = result.user.condominiums.map((c: Condominium) => c.id);

        if (!currentCondoId || !ids.includes(currentCondoId)) {
          const firstCondo = result.user.condominiums[0];
          if (firstCondo) {
            dispatch(setCurrentCondominium(firstCondo.id));
          }
        }
      }

      return result;
    },
    [dispatch]
  );

  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      role?: string;
      requestedCondominiumSlug: string;
      phone?: string;
      consentDataProcessing?: boolean;
      consentWhatsapp?: boolean;
    }) => {
      const result = await dispatch(
        registerAction({
          email: data.email,
          password: data.password,
          name: data.name,
          role: data.role || "RESIDENT",
          requestedCondominiumSlug: data.requestedCondominiumSlug,
          requestedPhone: data.phone,
          consentDataProcessing: data.consentDataProcessing ?? false,
          consentWhatsapp: data.consentWhatsapp ?? false,
        })
      ).unwrap();

      return result;
    },
    [dispatch]
  );

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignora erro do backend
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    dispatch(logoutAction());
    dispatch(clearCondominiums());
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch(logoutAction());
    dispatch(clearCondominiums());
  }, [dispatch]);

  const updateUserProfile = useCallback(
    async (data: Partial<User>) => {
      return dispatch(updateProfileAction(data)).unwrap();
    },
    [dispatch]
  );

  return {
    user,
    isAuthenticated,
    userRole,
    isLoading: auth.isLoading,
    loading: auth.isLoading,
    login,
    logout,
    signIn,
    signUp,
    signOut,
    updateProfile: updateUserProfile,
  };
};
