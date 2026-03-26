import { Middleware, type AnyAction } from "@reduxjs/toolkit";
import {
  refreshAccessToken,
  logout,
  selectShouldRefreshToken,
  selectIsTokenExpired,
  selectIsAuthenticated,
} from "../slices/authSlice";

/**
 * Middleware Redux para gerenciamento automático de tokens JWT
 *
 * Funcionalidades:
 * - Verifica expiração de token antes de cada ação
 * - Renova automaticamente tokens próximos de expirar
 * - Faz logout automático quando token expira e refresh falha
 * - Executa verificações periódicas em background
 */
export const authMiddleware: Middleware = (store) => {
  let tokenCheckInterval: ReturnType<typeof setInterval> | null = null;
  let isRefreshing = false;

  /**
   * Verifica se o token precisa ser renovado e executa a renovação
   */
  const checkAndRefreshToken = async () => {
    const state = store.getState();
    const isAuthenticated = selectIsAuthenticated(state);
    const shouldRefresh = selectShouldRefreshToken(state);
    const isExpired = selectIsTokenExpired(state);

    // Não fazer nada se não estiver autenticado
    if (!isAuthenticated) {
      stopTokenCheck();
      return;
    }

    // Se o token já expirou, fazer logout
    if (isExpired) {
      store.dispatch(logout());
      stopTokenCheck();
      return;
    }

    // Se o token está próximo de expirar e não estamos já renovando
    if (shouldRefresh && !isRefreshing) {
      isRefreshing = true;

      try {
        const result = store.dispatch(
          refreshAccessToken() as unknown as AnyAction
        );
        if ("unwrap" in result && typeof result.unwrap === "function") {
          await result.unwrap();
        }
      } catch {
        store.dispatch(logout());
        stopTokenCheck();
      } finally {
        isRefreshing = false;
      }
    }
  };

  /**
   * Inicia verificações periódicas do token (a cada 30 segundos)
   */
  const startTokenCheck = () => {
    if (tokenCheckInterval) return; // Já está rodando

    tokenCheckInterval = setInterval(() => {
      checkAndRefreshToken();
    }, 30000); // Verifica a cada 30 segundos
  };

  /**
   * Para as verificações periódicas
   */
  const stopTokenCheck = () => {
    if (tokenCheckInterval) {
      clearInterval(tokenCheckInterval);
      tokenCheckInterval = null;
    }
  };

  return (next) => (action: unknown) => {
    const typedAction = action as { type?: string; payload?: unknown };
    const result = next(
      action as Parameters<Parameters<ReturnType<Middleware>>[0]>[0]
    );
    const state = store.getState();
    const isAuthenticated = selectIsAuthenticated(state);

    // Após ações de login bem-sucedido, iniciar verificações
    if (typedAction.type === "auth/login/fulfilled") {
      startTokenCheck();
      // Verificar imediatamente após login
      checkAndRefreshToken();
    }

    // Após logout, parar verificações
    if (
      typedAction.type === "auth/logout" ||
      typedAction.type === "auth/login/rejected"
    ) {
      stopTokenCheck();
    }

    // Verificar token antes de qualquer ação se estiver autenticado
    if (isAuthenticated && !isRefreshing) {
      // Verificar em background (não bloqueia a ação)
      Promise.resolve().then(() => checkAndRefreshToken());
    }

    return result;
  };
};
