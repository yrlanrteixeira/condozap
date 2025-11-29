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
      console.warn("⚠️ Token JWT não contém campo 'exp' (expiração)");
      return null;
    }

    // JWT exp vem em SEGUNDOS, converter para MILISSEGUNDOS
    const expiryMs = decoded.exp * 1000;

    if (expiryMs <= Date.now()) {
      console.warn("⚠️ Token JWT já está expirado");
      return null;
    }

    const expiryDate = new Date(expiryMs);
    const timeUntilExpiry = expiryMs - Date.now();
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));

    console.log("✅ Validade do token extraída:", {
      expiresAt: expiryDate.toLocaleString("pt-BR"),
      hoursRemaining: hoursUntilExpiry,
    });

    return expiryMs;
  } catch (error) {
    console.error("❌ Erro ao decodificar token JWT:", error);
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
  console.warn(
    "⚠️ Não foi possível extrair validade do token, usando fallback de 15 minutos"
  );
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
        console.warn("⚠️ Perfil inválido detectado:", response.data.user.role);
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
      console.error("❌ Erro ao renovar token:", message);
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
      console.log("🔄 Access token atualizado");
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

          console.log("✅ Login realizado com sucesso:", {
            userId: state.user.id,
            role: state.user.role,
            tokenExpiresAt: new Date(
              state.tokenExpiresAt || 0
            ).toLocaleString(),
          });
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
        console.log(
          "✅ Token renovado - Expira em:",
          new Date(state.tokenExpiresAt).toLocaleString()
        );
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // Se falhar ao renovar, fazer logout
        console.error("❌ Falha ao renovar token - Realizando logout");
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.tokenExpiresAt = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = "Sessão expirada";
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
