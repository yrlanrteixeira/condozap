import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'

// Typed hooks para Redux
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

// Custom hooks
export { useMessages } from './useMessages'
export { useComplaints } from './useComplaints'
