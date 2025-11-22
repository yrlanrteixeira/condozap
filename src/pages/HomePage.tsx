import { useState, useEffect } from 'react'
import { Sidebar, MobileHeader, NotificationToast } from '@/components/layout'
import {
  Dashboard,
  MessagingPanel,
  StructurePanel,
  ComplaintsPanel,
  HistoryPanel,
} from '@/features'
import { useNotification, useMessages, useComplaints } from '@/hooks'
import { INITIAL_RESIDENTS } from '@/data/mock'
import type { View, UserRole, Resident } from '@/types'

export function HomePage() {
  const [view, setView] = useState<View>('dashboard')
  const [userRole, setUserRole] = useState<UserRole>('admin')
  const [residents] = useState<Resident[]>(INITIAL_RESIDENTS)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { notification, showNotification } = useNotification()

  const { messageLog, sendMessage } = useMessages({
    residents,
    onSuccess: (count) => showNotification(`${count} mensagens enviadas com sucesso!`),
    onError: (message) => showNotification(message, 'error'),
  })

  const {
    complaints,
    handleComplaintSubmit,
    onDragStart,
    onDragOver,
    onDrop,
  } = useComplaints({
    residents,
    sendMessage,
    onSuccess: (message) => showNotification(message),
  })

  useEffect(() => {
    if (userRole === 'resident') {
      setView('complaints')
    } else if (view === 'complaints' && userRole !== 'resident') {
      setView('dashboard')
    }
  }, [userRole, view])

  const openComplaintsCount = complaints.filter((c) => c.status === 'open').length

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar
        view={view}
        setView={setView}
        userRole={userRole}
        setUserRole={setUserRole}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        openComplaintsCount={openComplaintsCount}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <NotificationToast notification={notification} />

          {view === 'dashboard' && (
            <Dashboard
              residents={residents}
              messageLog={messageLog}
              complaints={complaints}
            />
          )}
          {view === 'messages' && <MessagingPanel sendMessage={sendMessage} />}
          {view === 'structure' && <StructurePanel residents={residents} />}
          {view === 'complaints' && (
            <ComplaintsPanel
              userRole={userRole}
              complaints={complaints}
              residents={residents}
              onComplaintSubmit={handleComplaintSubmit}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          )}
          {view === 'history' && <HistoryPanel messageLog={messageLog} />}
        </main>
      </div>
    </div>
  )
}
