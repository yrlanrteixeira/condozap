import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Condominium } from '@/types'
import { CONDOMINIUMS } from '@/data/multiCondoMockData'

interface CondominiumState {
  currentCondominiumId: string | null
  condominiums: Condominium[]
}

const initialState: CondominiumState = {
  currentCondominiumId: 'condo-1',
  condominiums: CONDOMINIUMS,
}

const condominiumSlice = createSlice({
  name: 'condominium',
  initialState,
  reducers: {
    setCurrentCondominiumId: (state, action: PayloadAction<string | null>) => {
      state.currentCondominiumId = action.payload
    },
    setCondominiums: (state, action: PayloadAction<Condominium[]>) => {
      state.condominiums = action.payload
    },
  },
})

// Actions
export const { setCurrentCondominiumId, setCondominiums } = condominiumSlice.actions

// Selectors
export const selectCurrentCondominiumId = (state: { condominium: CondominiumState }) =>
  state.condominium.currentCondominiumId

export const selectCondominiums = (state: { condominium: CondominiumState }) =>
  state.condominium.condominiums

export const selectCurrentCondominium = (state: { condominium: CondominiumState }) => {
  const id = state.condominium.currentCondominiumId
  if (!id) return null
  return state.condominium.condominiums.find(c => c.id === id) || null
}

export const selectAccessibleCondominiums = (state: {
  condominium: CondominiumState
  user: { currentUser: { condominiumIds: string[] } }
}) => {
  return state.condominium.condominiums.filter(c =>
    state.user.currentUser.condominiumIds.includes(c.id)
  )
}

export default condominiumSlice.reducer
