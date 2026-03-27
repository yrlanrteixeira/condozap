/**
 * API Client Configuration
 * Single Responsibility: Configure and export axios instance with interceptors
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import qs from "qs";
import { config } from "./config";

let apiStore: any = null;

export const setApiStore = (store: any) => {
  apiStore = store;
};

/**
 * Serializa parâmetros de query mantendo + literal para espaços em campos específicos
 * Útil para endpoints que esperam espaços como + na query string
 * @param params - Parâmetros a serem serializados
 * @param fieldsWithPlus - Campos que devem ter espaços convertidos em + literal
 * @returns Query string serializada
 */
export const createParamsSerializer = (
  fieldsWithPlus: string[] = []
): ((params: Record<string, string | number>) => string) => {
  return (params: Record<string, string | number>): string => {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      const encodedKey = encodeURIComponent(key);
      let encodedValue: string;
      if (fieldsWithPlus.includes(key) && typeof value === "string") {
        encodedValue = encodeURIComponent(value).replace(/%20/g, "+");
      } else {
        encodedValue = encodeURIComponent(String(value));
      }
      parts.push(`${encodedKey}=${encodedValue}`);
    }
    return parts.join("&");
  };
};

/**
 * Flag para prevenir múltiplas tentativas simultâneas de refresh
 */
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Adiciona uma função à fila de espera do refresh
 */
const subscribeTokenRefresh = (callback: (token: string) => void): void => {
  refreshSubscribers.push(callback);
};

/**
 * Executa todas as requisições que estavam esperando o refresh
 */
const onRefreshed = (token: string): void => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * Cliente HTTP configurado com Axios
 * Inclui interceptors para:
 * - Injeção automática de JWT
 * - Renovação automática de tokens em 401
 * - Tratamento de erros centralizado
 * - Serialização correta de arrays em query params
 */
export const api: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
  // Serializa corretamente arrays nos parâmetros de query
  // Exemplo: [1, 2, 3] vira "param=1&param=2&param=3" (sem colchetes)
  paramsSerializer: (params) => {
    return qs.stringify(params, {
      arrayFormat: "repeat", // idStatus=1&idStatus=2
      skipNulls: true, // Remove parâmetros null/undefined
      encode: true, // Faz encoding dos valores
    });
  },
});

/**
 * REQUEST INTERCEPTOR
 * Injeta automaticamente o JWT em todas as requisições
 */
api.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    // Pula autenticação para endpoints públicos
    if (
      requestConfig.url?.includes("/auth/login") ||
      requestConfig.url?.includes("/auth/refresh")
    ) {
      return requestConfig;
    }

    // Obtém token do localStorage
    const token = localStorage.getItem("auth_token");
    if (token && requestConfig.headers) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    return requestConfig;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Trata erros e renova tokens automaticamente em 401
 */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Se não tem config, rejeita
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Erro 401: Token inválido ou expirado
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Se já está fazendo refresh, adiciona requisição à fila
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      // Marca que já tentou renovar para evitar loop infinito
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");

        // Se não tem refresh token, faz logout
        if (!refreshToken) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          if (!window.location.pathname.includes("/auth/login")) {
            window.location.href = "/auth/login";
          }
          return Promise.reject(error);
        }

        // Tenta renovar o token
        const response = await axios.post(`${config.apiUrl}/auth/refresh`, {
          refreshToken,
        });

        const newToken = response.data.token;
        const newRefreshToken = response.data.refreshToken;

        localStorage.setItem("auth_token", newToken);
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
        }

        if (apiStore) {
          const { updateAccessToken } = await import(
            "@/shared/store/slices/authSlice"
          );
          apiStore.dispatch(
            updateAccessToken({ token: newToken, refreshToken: newRefreshToken })
          );
        }

        // Atualiza header da requisição original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        // Executa requisições que estavam na fila
        onRefreshed(newToken);
        isRefreshing = false;

        // Retenta a requisição original
        return api(originalRequest);
      } catch (refreshError) {
        // Falha ao renovar token - fazer logout
        isRefreshing = false;
        refreshSubscribers = [];
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        if (!window.location.pathname.includes("/auth/login")) {
          window.location.href = "/auth/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // Outros erros com resposta do servidor: extrai mensagem amigável
    if (error.response) {
      const data = error.response.data as any;
      // Suporta tanto o formato flat { message } quanto o nested { error: { message } }
      const message =
        data?.message ||
        data?.error?.message ||
        "Ocorreu um erro inesperado";
      error.message = message;
    } else if (error.request) {
      // Erro de rede: sem resposta do servidor
      error.message = "Sem conexão com o servidor. Verifique sua internet.";
    }

    return Promise.reject(error);
  }
);
