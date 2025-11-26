import { useState } from "react";
import {
  LayoutDashboard,
  Send,
  Building,
  History,
  AlertTriangle,
  X,
  ListChecks,
  Building2,
} from "lucide-react";
import type { View, UserRole } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts";
import { ModeToggle } from "@/components/mode-toggle";
import { CondoSwitcher } from "./CondoSwitcher";
import { USERS } from "@/data/multiCondoMockData";
import { Logo } from "@/components/Logo";

interface SidebarProps {
  openComplaintsCount: number;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  viewKey: View;
  currentView: View;
  onClick: () => void;
  badge?: number;
}

function NavItem({
  icon,
  label,
  viewKey,
  currentView,
  onClick,
  badge,
}: NavItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full justify-start gap-3 h-12",
        currentView === viewKey
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
  );
}

export function Sidebar({ openComplaintsCount }: SidebarProps) {
  const {
    view,
    setView,
    userRole,
    setUserRole,
    mobileMenuOpen,
    setMobileMenuOpen,
    currentUser,
    setCurrentUser,
    isProfessionalSyndic,
    getCurrentCondominium,
  } = useApp();
  
  const currentCondo = getCurrentCondominium();
  
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card text-card-foreground border-r transform transition-transform duration-200 ease-in-out flex flex-col overflow-hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:translate-x-0"
      )}
    >
      {/* Header - Logo */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-end w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden"
            >
              <X size={24} />
            </Button>
          </div>
          <Logo size="lg" />
        </div>
      </div>

      {/* Context Switcher - só aparece para Síndico Profissional */}
      {isProfessionalSyndic() && (
        <div className="flex-shrink-0 p-4 border-b">
          <CondoSwitcher />
          {currentCondo && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {currentCondo.towers.length} {currentCondo.towers.length === 1 ? 'torre' : 'torres'}
            </p>
          )}
        </div>
      )}

      {/* Info do condomínio atual (para admin local) */}
      {!isProfessionalSyndic() && currentCondo && (
        <div className="flex-shrink-0 p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{currentCondo.name}</p>
              <p className="text-xs text-muted-foreground">Admin Local</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {userRole !== "resident" ? (
          <>
            <NavItem
              icon={<LayoutDashboard size={20} />}
              label="Visão Geral"
              viewKey="dashboard"
              currentView={view}
              onClick={() => setView("dashboard")}
            />
            <NavItem
              icon={<Send size={20} />}
              label="Enviar Mensagens"
              viewKey="messages"
              currentView={view}
              onClick={() => setView("messages")}
            />
            <NavItem
              icon={<Building size={20} />}
              label="Estrutura"
              viewKey="structure"
              currentView={view}
              onClick={() => setView("structure")}
            />
            <NavItem
              icon={<History size={20} />}
              label="Logs do Sistema"
              viewKey="history"
              currentView={view}
              onClick={() => setView("history")}
            />
            <NavItem
              icon={<AlertTriangle size={20} />}
              label="Central de Ocorrências"
              viewKey="complaints"
              currentView={view}
              onClick={() => setView("complaints")}
              badge={openComplaintsCount}
            />
          </>
        ) : (
          <NavItem
            icon={<ListChecks size={20} />}
            label="Minhas Ocorrências"
            viewKey="complaints"
            currentView={view}
            onClick={() => setView("complaints")}
          />
        )}
      </nav>

      {/* Footer - Fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t space-y-3 bg-card">
        <div className="flex items-center justify-center">
          <ModeToggle />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-2 uppercase font-bold">
            Simular Usuário
          </div>
          <Select
            value={currentUser.id}
            onValueChange={(userId) => {
              const user = USERS.find(u => u.id === userId);
              if (user) setCurrentUser(user);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USERS.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {currentUser.permissionScope === 'global' ? '🌐 Acesso Global' : '🏢 Acesso Local'}
          </p>
        </div>
      </div>
    </div>
  );
}
