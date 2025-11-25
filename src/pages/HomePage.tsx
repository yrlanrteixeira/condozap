import { useEffect } from 'react'
import { Sidebar, MobileHeader, NotificationToast } from '@/components/layout'
import {
  Dashboard,
  MessagingPanel,
  StructurePanel,
  ComplaintsPanel,
  HistoryPanel,
} from '@/features'
import { useMessages, useComplaints } from '@/hooks'
import { useApp } from '@/contexts'
import { dataStore } from '@/data/mockData'

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
  } = useApp()

  const { messageLog, sendMessage } = useMessages({
    onSuccess: (count) => showNotification(`${count} mensagens enviadas com sucesso!`),
    onError: (message) => showNotification(message, 'error'),
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
  })

  useEffect(() => {
    if (userRole === 'resident' && view !== 'complaints') {
      setView('complaints')
    }
  }, [userRole, view, setView])

  const openComplaintsCount = complaints.filter((c) => c.status === 'open').length

  return (
    <div className="flex h-screen bg-background font-sans text-foreground">
      <Sidebar openComplaintsCount={openComplaintsCount} />

      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        <MobileHeader />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <NotificationToast />

          {view === 'dashboard' && (
            <Dashboard
              residents={dataStore.residents}
              messageLog={messageLog}
              complaints={complaints}
            />
          )}
          {view === 'messages' && <MessagingPanel sendMessage={sendMessage} />}
          {view === 'structure' && <StructurePanel residents={dataStore.residents} />}
          {view === 'complaints' && (
            <ComplaintsPanel
              userRole={userRole}
              complaints={complaints}
              residents={dataStore.residents}
              onComplaintSubmit={handleComplaintSubmit}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onComplaintsUpdate={refreshComplaints}
            />
          )}
          {view === 'history' && <HistoryPanel messageLog={messageLog} />}
        </main>
      </div>
    </div>
  )
}
