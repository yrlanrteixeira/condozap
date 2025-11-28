import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { View, Notification } from '@/types'

interface UiState {
  view: View
  mobileMenuOpen: boolean
  sidebarCollapsed: boolean
  notification: Notification | null
}

const initialState: UiState = {
  view: 'dashboard',
  mobileMenuOpen: false,
  sidebarCollapsed: false,
  notification: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setView: (state, action: PayloadAction<View>) => {
      state.view = action.payload
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload
    },
    setNotification: (state, action: PayloadAction<Notification | null>) => {
      state.notification = action.payload
    },
    showNotification: (state, action: PayloadAction<{ message: string; type?: 'success' | 'error' }>) => {
      state.notification = {
        message: action.payload.message,
        type: action.payload.type || 'success',
      }
    },
    clearNotification: (state) => {
      state.notification = null
    },
  },
})

// Actions
export const {
  setView,
  setMobileMenuOpen,
  setSidebarCollapsed,
  setNotification,
  showNotification,
  clearNotification,
} = uiSlice.actions

// Selectors
export const selectView = (state: { ui: UiState }) => state.ui.view
export const selectMobileMenuOpen = (state: { ui: UiState }) => state.ui.mobileMenuOpen
export const selectSidebarCollapsed = (state: { ui: UiState }) => state.ui.sidebarCollapsed
export const selectNotification = (state: { ui: UiState }) => state.ui.notification

export default uiSlice.reducer
