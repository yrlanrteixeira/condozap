import apiClient from "@/lib/api-client";
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
} from "@/types/user";

export const authApi = {
  /**
   * Realiza login e retorna access token e refresh token
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      "/auth/login/admin",
      credentials
    );
    return response.data;
  },

  /**
   * Renova o access token usando o refresh token
   */
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>(
      "/auth/refresh",
      {
        refreshToken,
      }
    );
    return response.data;
  },

  /**
   * Realiza logout no servidor (invalida refresh token)
   */
  logout: async (refreshToken?: string): Promise<void> => {
    if (refreshToken) {
      try {
        await apiClient.post("/auth/logout", { refreshToken });
      } catch (error) {
        console.warn("⚠️ Erro ao fazer logout no servidor:", error);
      }
    }
    console.log("🚪 Logout: limpeza local realizada");
  },
};
