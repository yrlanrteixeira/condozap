/**
 * Auth Slice
 * Gerencia estado de autenticação com refresh tokens automático
 */

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  AuthState,
  LoginRequest,
  LoginResponse,
  User,
} from "@/types/user";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/shared/utils/errorMessages";
import { UserRoles, isValidUserRole } from "@/config/permissions";
import { jwtDecode } from "jwt-decode";

interface JWTPayload {
  exp: number;
  iat?: number;
  userId?: string;
  role?: string;
  [key: string]: unknown;
}

// Configurações de token
const TOKEN_EXPIRY_TIME_FALLBACK = 15 * 60 * 1000; // 15 minutos em ms
const REFRESH_BEFORE_EXPIRY = 2 * 60 * 1000; // Renovar 2 minutos antes de expirar

/**
 * Extrai o tempo de expiração do token JWT
 */
const getTokenExpiry = (token: string): number | null => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);

    if (!decoded.exp) {
      return null;
    }

    // JWT exp vem em SEGUNDOS, converter para MILISSEGUNDOS
    const expiryMs = decoded.exp * 1000;

    if (expiryMs <= Date.now()) {
      return null;
    }

    return expiryMs;
  } catch {
    return null;
  }
};

/**
 * Calcula o timestamp de expiração do token
 */
const calculateTokenExpiry = (token: string): number => {
  const realExpiry = getTokenExpiry(token);

  if (realExpiry) {
    return realExpiry;
  }

  // Fallback para 15 minutos se não conseguir decodificar
  return Date.now() + TOKEN_EXPIRY_TIME_FALLBACK;
};

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  tokenExpiresAt: null,
  error: null,
};

/**
 * Thunk para realizar login
 */
export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await api.post<LoginResponse>(
        "/auth/login",
        credentials
      );

      // Validar o perfil do usuário
      if (!isValidUserRole(response.data.user.role)) {
        return rejectWithValue("INVALID_ROLE");
      }

      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "Erro ao fazer login";
      return rejectWithValue(message);
    }
  }
);

/**
 * Thunk para registrar novo usuario
 */
export const register = createAsyncThunk(
  "auth/register",
  async (
    data: {
      email: string;
      password: string;
      name: string;
      role?: string;
      requestedCondominiumId?: string;
      requestedPhone?: string;
      consentDataProcessing?: boolean;
      consentWhatsapp?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/auth/register", data);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error) || "Erro ao registrar");
    }
  }
);

/**
 * Thunk para buscar usuario atual (revalidacao de sessao)
 */
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error: any) {
      return rejectWithValue("Sessão inválida");
    }
  }
);

/**
 * Thunk para atualizar perfil
 */
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await api.patch("/auth/me", data);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(
        getApiErrorMessage(error) || "Erro ao atualizar perfil"
      );
    }
  }
);

/**
 * Thunk para renovar o token de acesso
 */
export const refreshAccessToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { refreshToken } = state.auth;

      if (!refreshToken) {
        return rejectWithValue("Refresh token não disponível");
      }

      const response = await api.post("/auth/refresh", { refreshToken });
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Erro ao renovar token";
      return rejectWithValue(message);
    }
  }
);

/**
 * Auth Slice
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Realiza logout e limpa todos os tokens
     */
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.tokenExpiresAt = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },

    /**
     * Define o usuário no estado
     */
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },

    /**
     * Atualiza apenas o access token (usado após refresh)
     */
    updateAccessToken: (
      state,
      action: PayloadAction<{ token: string; refreshToken?: string }>
    ) => {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.tokenExpiresAt = calculateTokenExpiry(action.payload.token);
    },

    /**
     * Limpa completamente o estado de autenticação
     */
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.tokenExpiresAt = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },

    /**
     * Limpa apenas o erro
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        login.fulfilled,
        (state, action: PayloadAction<LoginResponse>) => {
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.tokenExpiresAt = calculateTokenExpiry(action.payload.token);
          state.error = null;
        }
      )
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.tokenExpiresAt = null;
        state.error = action.payload as string;
      })
      // Refresh Token
      .addCase(refreshAccessToken.pending, () => {
        // Não mostrar loading durante refresh (operação em background)
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiresAt = calculateTokenExpiry(action.payload.token);
        state.error = null;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.tokenExpiresAt = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = "Sessão expirada";
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiresAt = calculateTokenExpiry(action.payload.token);
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Current User
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      // Update Profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

// Actions
export const { logout, setUser, updateAccessToken, clearAuth, clearError } =
  authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) =>
  state.auth.isLoading;
export const selectUserRole = (state: { auth: AuthState }) =>
  state.auth.user?.role;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectRefreshToken = (state: { auth: AuthState }) =>
  state.auth.refreshToken;
export const selectTokenExpiresAt = (state: { auth: AuthState }) =>
  state.auth.tokenExpiresAt;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

/**
 * Verifica se o token está próximo de expirar e precisa ser renovado
 */
export const selectShouldRefreshToken = (state: {
  auth: AuthState;
}): boolean => {
  const { tokenExpiresAt, refreshToken } = state.auth;
  if (!tokenExpiresAt || !refreshToken) return false;

  const timeUntilExpiry = tokenExpiresAt - Date.now();
  return timeUntilExpiry <= REFRESH_BEFORE_EXPIRY;
};

/**
 * Verifica se o token expirou
 */
export const selectIsTokenExpired = (state: { auth: AuthState }): boolean => {
  const { tokenExpiresAt } = state.auth;
  if (!tokenExpiresAt) return true;

  return Date.now() >= tokenExpiresAt;
};

/**
 * Verifica se o usuário é SUPER_ADMIN
 */
export const selectIsSuperAdmin = (state: { auth: AuthState }): boolean => {
  return state.auth.user?.role === UserRoles.SUPER_ADMIN;
};

/**
 * Verifica se o usuário é ADMIN
 */
export const selectIsAdmin = (state: { auth: AuthState }): boolean => {
  return state.auth.user?.role === UserRoles.ADMIN;
};

// Export constantes
export { TOKEN_EXPIRY_TIME_FALLBACK, REFRESH_BEFORE_EXPIRY };

export default authSlice.reducer;
