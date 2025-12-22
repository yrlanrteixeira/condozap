/**
 * User Slice
 * Gerencia o estado do usuário atual (separado de auth para melhor organização)
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { User, UserRole } from "@/types/user";

interface UserState {
  currentUser: User | null;
  role: UserRole | null;
}

const initialState: UserState = {
  currentUser: null,
  role: null,
};

/**
 * User Slice
 */
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    /**
     * Define o usuário atual
     */
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.role = action.payload.role;
    },

    /**
     * Define apenas a role do usuário
     */
    setUserRole: (state, action: PayloadAction<UserRole>) => {
      state.role = action.payload;
      if (state.currentUser) {
        state.currentUser.role = action.payload;
      }
    },

    /**
     * Atualiza dados do usuário
     */
    updateCurrentUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
        if (action.payload.role) {
          state.role = action.payload.role;
        }
      }
    },

    /**
     * Limpa o usuário atual
     */
    clearCurrentUser: (state) => {
      state.currentUser = null;
      state.role = null;
    },
  },
});

// Actions
export const { setCurrentUser, setUserRole, updateCurrentUser, clearCurrentUser } =
  userSlice.actions;

// Selectors
export const selectCurrentUser = (state: { user: UserState }): User | null =>
  state.user.currentUser;

export const selectUserRole = (state: { user: UserState }): UserRole | null =>
  state.user.role;

export const selectIsProfessionalSyndic = (state: { user: UserState }): boolean =>
  state.user.currentUser?.role === "PROFESSIONAL_SYNDIC";

export default userSlice.reducer;
