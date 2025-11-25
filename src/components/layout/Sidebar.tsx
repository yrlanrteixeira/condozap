import {
  LayoutDashboard,
  Send,
  Building,
  History,
  AlertTriangle,
  Smartphone,
  X,
  ListChecks,
} from 'lucide-react'
import type { View, UserRole } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useApp } from '@/contexts'

interface SidebarProps {
  openComplaintsCount: number
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  viewKey: View
  currentView: View
  onClick: () => void
  badge?: number
}

function NavItem({ icon, label, viewKey, currentView, onClick, badge }: NavItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'w-full justify-start gap-3 h-12',
        currentView === viewKey
          ? 'bg-green-600 text-white hover:bg-green-600 hover:text-white'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      )}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="ml-auto">
          {badge}
        </Badge>
      )}
    </Button>
  )
}

export function Sidebar({ openComplaintsCount }: SidebarProps) {
  const { view, setView, userRole, setUserRole, mobileMenuOpen, setMobileMenuOpen } = useApp()

  return (
    <div
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:translate-x-0'
      )}
    >
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Smartphone className="text-green-500" />
          <span>CondoZap</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden text-white hover:bg-slate-800"
        >
          <X size={24} />
        </Button>
      </div>

      <nav className="p-4 space-y-2">
        {userRole !== 'resident' ? (
          <>
            <NavItem
              icon={<LayoutDashboard size={20} />}
              label="Visão Geral"
              viewKey="dashboard"
              currentView={view}
              onClick={() => setView('dashboard')}
            />
            <NavItem
              icon={<Send size={20} />}
              label="Enviar Mensagens"
              viewKey="messages"
              currentView={view}
              onClick={() => setView('messages')}
            />
            <NavItem
              icon={<Building size={20} />}
              label="Estrutura"
              viewKey="structure"
              currentView={view}
              onClick={() => setView('structure')}
            />
            <NavItem
              icon={<History size={20} />}
              label="Logs do Sistema"
              viewKey="history"
              currentView={view}
              onClick={() => setView('history')}
            />
            <NavItem
              icon={<AlertTriangle size={20} />}
              label="Central de Ocorrências"
              viewKey="complaints"
              currentView={view}
              onClick={() => setView('complaints')}
              badge={openComplaintsCount}
            />
          </>
        ) : (
          <NavItem
            icon={<ListChecks size={20} />}
            label="Minhas Ocorrências"
            viewKey="complaints"
            currentView={view}
            onClick={() => setView('complaints')}
          />
        )}
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-2 uppercase font-bold">
          Simular Usuário
        </div>
        <Select value={userRole} onValueChange={(value) => setUserRole(value as UserRole)}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="syndic">Síndico</SelectItem>
            <SelectItem value="resident">Morador (Anônimo)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
