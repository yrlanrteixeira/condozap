/**
 * UI Slice
 * Gerencia estado da interface do usuário (view, sidebar, etc)
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type View =
  | "unified_dashboard"
  | "dashboard"
  | "messages"
  | "structure"
  | "complaints"
  | "history";

interface Notification {
  message: string;
  type: "success" | "error";
}

interface UiState {
  view: View;
  isSidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  isMobile: boolean;
  notification: Notification | null;
}

const initialState: UiState = {
  view: "dashboard",
  isSidebarOpen: true,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  isMobile: false,
  notification: null,
};

/**
 * UI Slice
 */
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    /**
     * Define a view atual
     */
    setView: (state, action: PayloadAction<View>) => {
      state.view = action.payload;
    },

    /**
     * Alterna o estado da sidebar
     */
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },

    /**
     * Define o estado da sidebar
     */
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },

    /**
     * Define se a sidebar está colapsada
     */
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },

    /**
     * Define se o menu mobile está aberto
     */
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },

    /**
     * Define se está em modo mobile
     */
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },

    /**
     * Mostra uma notificação
     */
    showNotification: (state, action: PayloadAction<Notification>) => {
      state.notification = action.payload;
    },

    /**
     * Limpa a notificação
     */
    clearNotification: (state) => {
      state.notification = null;
    },
  },
});

// Actions
export const {
  setView,
  toggleSidebar,
  setSidebarOpen,
  setSidebarCollapsed,
  setMobileMenuOpen,
  setIsMobile,
  showNotification,
  clearNotification,
} = uiSlice.actions;

// Selectors
export const selectView = (state: { ui: UiState }): View => state.ui.view;
export const selectIsSidebarOpen = (state: { ui: UiState }): boolean =>
  state.ui.isSidebarOpen;
export const selectSidebarCollapsed = (state: { ui: UiState }): boolean =>
  state.ui.sidebarCollapsed;
export const selectMobileMenuOpen = (state: { ui: UiState }): boolean =>
  state.ui.mobileMenuOpen;
export const selectIsMobile = (state: { ui: UiState }): boolean =>
  state.ui.isMobile;
export const selectNotification = (state: {
  ui: UiState;
}): Notification | null => state.ui.notification;

export default uiSlice.reducer;
