import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import qs from "qs";
import { config } from "./config";
import { refreshAccessToken } from "../shared/store/slices/authSlice";
import type { Store } from "@reduxjs/toolkit";

const BASE_URL = config.apiUrl;

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
 * Cliente HTTP configurado com Axios
 * Inclui interceptors para:
 * - Injeção automática de JWT
 * - Renovação automática de tokens em 401
 * - Tratamento de erros centralizado
 * - Serialização correta de arrays em query params
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
  // Serializa corretamente arrays nos parâmetros de query
  // Exemplo: [1, 2, 3] vira "param=1&param=2&param=3" (sem colchetes)
  paramsSerializer: (params) => {
    return qs.stringify(params, {
      arrayFormat: "repeat", // idStatus=1&idStatus=2 (formato que o NestJS espera)
      skipNulls: true, // Remove parâmetros null/undefined
      encode: true, // Faz encoding dos valores
    });
  },
});

/**
 * Store do Redux - será definido após a configuração inicial
 * Usado para acessar tokens e dispatch de actions
 */
let reduxStore: Store | null = null;

/**
 * Define o store do Redux para uso nos interceptors
 * Deve ser chamado na inicialização da aplicação
 */
export const setReduxStore = (store: Store) => {
  reduxStore = store;
};

/**
 * Flag para prevenir múltiplas tentativas simultâneas de refresh
 */
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Adiciona uma função à fila de espera do refresh
 */
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * Executa todas as requisições que estavam esperando o refresh
 */
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * REQUEST INTERCEPTOR
 * Injeta automaticamente o JWT em todas as requisições
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Pula autenticação para endpoints públicos
    if (
      config.url?.includes("/auth/login/admin") ||
      config.url?.includes("/auth/refresh")
    ) {
      return config;
    }

    // Obtém token do Redux store
    if (reduxStore) {
      const state = reduxStore.getState();
      const token = state.auth?.token;

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Trata erros e renova tokens automaticamente em 401
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Se não tem config, rejeita
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Erro 403: acesso negado
    if (error.response?.status === 403) {
      if (!window.location.pathname.includes("/access-denied")) {
        window.location.href = "/access-denied";
      }
      return Promise.reject(error);
    }

    // Erro 402: Assinatura requerida — síndico sem assinatura ativa.
    // Propaga um custom event que o SubscriptionStatusBanner escuta pra
    // mostrar toast + redirecionar para /assinatura.
    if (error.response?.status === 402) {
      const body = error.response.data as {
        error?: { code?: string; message?: string };
      } | undefined;
      const reason = body?.error?.code ?? "NO_SUBSCRIPTION";
      const message = body?.error?.message ?? "Assinatura necessária";
      window.dispatchEvent(
        new CustomEvent("billing:blocked", {
          detail: { reason, message },
        }),
      );
      // Don't auto-redirect — the banner component decides what to do
      return Promise.reject(error);
    }

    // Erro 401: Token inválido ou expirado
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Se não tem store configurado, redireciona para login
      if (!reduxStore) {
        if (!window.location.pathname.includes("/auth/login")) {
          window.location.href = "/auth/login";
        }
        return Promise.reject(error);
      }

      // Se já está fazendo refresh, adiciona requisição à fila
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      // Marca que já tentou renovar para evitar loop infinito
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const state = reduxStore.getState();
        const refreshToken = state.auth?.refreshToken;

        // Se não tem refresh token, faz logout
        if (!refreshToken) {
          reduxStore.dispatch({ type: "auth/logout" });
          if (!window.location.pathname.includes("/auth/login")) {
            window.location.href = "/auth/login";
          }
          return Promise.reject(error);
        }

        // Tenta renovar o token
        const result = await reduxStore.dispatch(refreshAccessToken()).unwrap();

        // Token renovado com sucesso
        const newToken = result.token;

        // Atualiza header da requisição original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        // Executa requisições que estavam na fila
        onRefreshed(newToken);
        isRefreshing = false;

        // Retenta a requisição original
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Falha ao renovar token - fazer logout
        isRefreshing = false;
        refreshSubscribers = [];

        reduxStore.dispatch({ type: "auth/logout" });

        if (!window.location.pathname.includes("/auth/login")) {
          window.location.href = "/auth/login";
        }

        return Promise.reject(refreshError);
      }
    }

    // Outros erros: apenas rejeita
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
