/**
 * Condominium Slice
 * Gerencia o estado do condomínio atual e lista de condomínios
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Condominium } from "@/types/user";

interface CondominiumState {
  currentCondominiumId: string | null;
  condominiums: Condominium[];
}

const initialState: CondominiumState = {
  currentCondominiumId: null,
  condominiums: [],
};

/**
 * Condominium Slice
 */
const condominiumSlice = createSlice({
  name: "condominium",
  initialState,
  reducers: {
    /**
     * Define o condomínio atual
     */
    setCurrentCondominium: (state, action: PayloadAction<string>) => {
      state.currentCondominiumId = action.payload;
    },

    /**
     * Define a lista de condomínios disponíveis
     */
    setCondominiums: (state, action: PayloadAction<Condominium[]>) => {
      state.condominiums = action.payload;
    },

    /**
     * Limpa o condomínio atual
     */
    clearCurrentCondominium: (state) => {
      state.currentCondominiumId = null;
    },

    /**
     * Limpa todo o estado
     */
    clearCondominiums: (state) => {
      state.currentCondominiumId = null;
      state.condominiums = [];
    },
  },
});

// Actions
export const {
  setCurrentCondominium,
  setCondominiums,
  clearCurrentCondominium,
  clearCondominiums,
} = condominiumSlice.actions;

export const setCurrentCondominiumId = setCurrentCondominium;

// Selectors
export const selectCurrentCondominiumId = (state: {
  condominium: CondominiumState;
}): string | null => state.condominium.currentCondominiumId;

export const selectCondominiums = (state: {
  condominium: CondominiumState;
}): Condominium[] => state.condominium.condominiums;

export const selectCurrentCondominium = (state: {
  condominium: CondominiumState;
}): Condominium | null => {
  const currentId = state.condominium.currentCondominiumId;
  if (!currentId) return null;
  return state.condominium.condominiums.find((c) => c.id === currentId) || null;
};

export const selectAccessibleCondominiums = (state: {
  condominium: CondominiumState;
}): Condominium[] => state.condominium.condominiums;

export default condominiumSlice.reducer;
