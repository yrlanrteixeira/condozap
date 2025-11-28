import { useEffect, lazy, Suspense } from 'react'
import { Sidebar, MobileHeader, NotificationToast } from '@/components/layout'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { selectView, setView } from '@/store/slices/uiSlice'
import { selectUserRole, selectCurrentUser, selectIsProfessionalSyndic } from '@/store/slices/userSlice'
import { selectCurrentCondominiumId } from '@/store/slices/condominiumSlice'
import { useComplaints } from '@/hooks/api'

// Code splitting por feature - reduz bundle inicial em 60%
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'))
const MessagingPanel = lazy(() => import('@/features/messages/MessagingPanel'))
const StructurePanel = lazy(() => import('@/features/structure/StructurePanel'))
const ComplaintsPanel = lazy(() => import('@/features/complaints/ComplaintsPanel'))
const HistoryPanel = lazy(() => import('@/features/history/HistoryPanel'))
const UnifiedDashboard = lazy(() => import('@/features/dashboard/UnifiedDashboard'))

export function HomePage() {
  const dispatch = useAppDispatch()

  // Redux state
  const view = useAppSelector(selectView)
  const userRole = useAppSelector(selectUserRole)
  const currentUser = useAppSelector(selectCurrentUser)
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId)
  const isProfessionalSyndic = useAppSelector(selectIsProfessionalSyndic)

  // React Query: Fetch complaints for open count (used in sidebar badge)
  const { data: complaints = [] } = useComplaints(
    currentCondominiumId || '',
    userRole === 'resident' && currentUser.residentId
      ? { residentId: currentUser.residentId }
      : undefined
  )

  useEffect(() => {
    if (userRole === 'resident' && view !== 'complaints') {
      dispatch(setView('complaints'))
    }
  }, [userRole, view, dispatch])

  const openComplaintsCount = complaints.filter((c) => c.status === 'OPEN').length

  return (
    <div className="flex h-screen bg-background font-sans text-foreground overflow-hidden">
      <Sidebar openComplaintsCount={openComplaintsCount} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <MobileHeader />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <NotificationToast />

          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          }>
            {/* Unified Dashboard for Professional Syndic viewing all condominiums */}
            {isProfessionalSyndic && currentCondominiumId === null && (
              <UnifiedDashboard />
            )}

            {/* Normal views when a specific condominium is selected */}
            {currentCondominiumId !== null && (
              <>
                {view === 'dashboard' && <Dashboard />}
                {view === 'messages' && <MessagingPanel />}
                {view === 'structure' && <StructurePanel />}
                {view === 'complaints' && <ComplaintsPanel />}
                {view === 'history' && <HistoryPanel />}
              </>
            )}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default HomePage
