import { useEffect, useMemo, lazy, Suspense } from 'react'
import { Sidebar, MobileHeader, NotificationToast } from '@/components/layout'
import { useMessages, useComplaints } from '@/hooks'
import { useApp } from '@/contexts'
import {
  MULTI_CONDO_RESIDENTS,
  MULTI_CONDO_COMPLAINTS,
  MULTI_CONDO_MESSAGES
} from '@/data/multiCondoMockData'

// Code splitting por feature - reduz bundle inicial em 60%
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'))
const MessagingPanel = lazy(() => import('@/features/messages/MessagingPanel'))
const StructurePanel = lazy(() => import('@/features/structure/StructurePanel'))
const ComplaintsPanel = lazy(() => import('@/features/complaints/ComplaintsPanel'))
const HistoryPanel = lazy(() => import('@/features/history/HistoryPanel'))
const UnifiedDashboard = lazy(() => import('@/features/dashboard/UnifiedDashboard'))

export function HomePage() {
  const {
    view,
    setView,
    userRole,
    setUserRole,
    mobileMenuOpen,
    setMobileMenuOpen,
    notification,
    showNotification,
    currentCondominiumId,
    isProfessionalSyndic,
    currentUser,
  } = useApp()

  // Filtrar dados pelo condomínio atual
  const currentResidents = useMemo(() => {
    if (!currentCondominiumId) return []
    return MULTI_CONDO_RESIDENTS.filter(r => r.condominiumId === currentCondominiumId)
  }, [currentCondominiumId])

  const currentComplaints = useMemo(() => {
    if (!currentCondominiumId) return MULTI_CONDO_COMPLAINTS

    // Se for morador, filtrar apenas suas próprias ocorrências
    if (userRole === 'resident' && currentUser.residentId) {
      return MULTI_CONDO_COMPLAINTS.filter(
        c => c.condominiumId === currentCondominiumId && c.residentId === currentUser.residentId
      )
    }

    return MULTI_CONDO_COMPLAINTS.filter(c => c.condominiumId === currentCondominiumId)
  }, [currentCondominiumId, userRole, currentUser])

  const currentMessages = useMemo(() => {
    if (!currentCondominiumId) return []
    return MULTI_CONDO_MESSAGES.filter(m => m.condominiumId === currentCondominiumId)
  }, [currentCondominiumId])

  const { messageLog, sendMessage } = useMessages({
    onSuccess: (count) => showNotification(`${count} mensagens enviadas com sucesso!`),
    onError: (message) => showNotification(message, 'error'),
    initialMessages: currentMessages,
  })

  const {
    complaints,
    handleComplaintSubmit,
    onDragStart,
    onDragOver,
    onDrop,
    refreshComplaints,
  } = useComplaints({
    onSuccess: (message) => showNotification(message),
    initialComplaints: currentComplaints,
    currentCondominiumId: currentCondominiumId || undefined,
  })

  useEffect(() => {
    if (userRole === 'resident' && view !== 'complaints') {
      setView('complaints')
    }
  }, [userRole, view, setView])

  const openComplaintsCount = currentComplaints.filter((c) => c.status === 'open').length

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
            {isProfessionalSyndic() && currentCondominiumId === null && (
              <UnifiedDashboard />
            )}

            {/* Normal views when a specific condominium is selected */}
            {currentCondominiumId !== null && (
              <>
                {view === 'dashboard' && (
                  <Dashboard
                    residents={currentResidents}
                    messageLog={messageLog}
                    complaints={complaints}
                  />
                )}
                {view === 'messages' && <MessagingPanel sendMessage={sendMessage} residents={currentResidents} />}
                {view === 'structure' && <StructurePanel residents={currentResidents} />}
                {view === 'complaints' && (
                  <ComplaintsPanel
                    userRole={userRole}
                    complaints={complaints}
                    residents={currentResidents}
                    onComplaintSubmit={handleComplaintSubmit}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onComplaintsUpdate={refreshComplaints}
                  />
                )}
                {view === 'history' && <HistoryPanel messageLog={messageLog} />}
              </>
            )}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
