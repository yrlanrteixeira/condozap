import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User, UserRole } from '@/types'
import { USERS } from '@/data/multiCondoMockData'

interface UserState {
  currentUser: User
  userRole: UserRole
}

const initialState: UserState = {
  currentUser: USERS[0], // Síndico Profissional por padrão
  userRole: USERS[0].role,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload
      state.userRole = action.payload.role
    },
    setUserRole: (state, action: PayloadAction<UserRole>) => {
      state.userRole = action.payload
    },
  },
})

// Actions
export const { setCurrentUser, setUserRole } = userSlice.actions

// Selectors
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser
export const selectUserRole = (state: { user: UserState }) => state.user.userRole
export const selectIsProfessionalSyndic = (state: { user: UserState }) =>
  state.user.currentUser.role === 'professional_syndic' &&
  state.user.currentUser.permissionScope === 'global'

export default userSlice.reducer
