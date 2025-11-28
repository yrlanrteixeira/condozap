import { memo, useCallback } from "react";
import {
  LayoutDashboard,
  Send,
  Building,
  AlertTriangle,
  X,
  ListChecks,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { View } from "@/types";
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
  collapsed?: boolean;
}

const NavItem = memo(function NavItem({
  icon,
  label,
  viewKey,
  currentView,
  onClick,
  badge,
  collapsed = false,
}: NavItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full h-10 px-3 relative",
        collapsed ? "justify-center" : "justify-start gap-3",
        currentView === viewKey
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="ml-auto">
          {badge}
        </Badge>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {badge}
        </Badge>
      )}
    </Button>
  );
});

export const Sidebar = memo(function Sidebar({ openComplaintsCount }: SidebarProps) {
  const {
    view,
    setView,
    userRole,
    mobileMenuOpen,
    setMobileMenuOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    currentUser,
    setCurrentUser,
    isProfessionalSyndic,
    getCurrentCondominium,
  } = useApp();

  const currentCondo = getCurrentCondominium();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-card text-card-foreground border-r",
          "flex flex-col overflow-hidden",
          "transform transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static md:z-auto",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header - Logo */}
        <div className="flex-shrink-0 p-3 border-b">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 flex justify-center">
                <Logo size="md" />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden md:flex h-8 w-8 flex-shrink-0"
                  aria-label="Colapsar menu"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="md:hidden h-8 w-8 flex-shrink-0"
                  aria-label="Fechar menu"
                >
                  <X size={20} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center">
                <Logo size="sm" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex h-8 w-8 flex-shrink-0"
                aria-label="Expandir menu"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Context Switcher - só aparece para Síndico Profissional */}
        {isProfessionalSyndic() && !sidebarCollapsed && (
          <div className="flex-shrink-0 p-3 border-b">
            <CondoSwitcher />
            {currentCondo && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {currentCondo.towers.length}{" "}
                {currentCondo.towers.length === 1 ? "torre" : "torres"}
              </p>
            )}
          </div>
        )}

        {/* Info do condomínio atual (para admin local) */}
        {!isProfessionalSyndic() && currentCondo && !sidebarCollapsed && (
          <div className="flex-shrink-0 p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {currentCondo.name}
                </p>
                <p className="text-xs text-muted-foreground">Admin Local</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {userRole !== "resident" ? (
            <>
              <NavItem
                icon={<LayoutDashboard size={20} />}
                label="Visão Geral"
                viewKey="dashboard"
                currentView={view}
                onClick={() => {
                  setView("dashboard");
                  setMobileMenuOpen(false);
                }}
                collapsed={sidebarCollapsed}
              />
              <NavItem
                icon={<Send size={20} />}
                label="Enviar Mensagens"
                viewKey="messages"
                currentView={view}
                onClick={() => {
                  setView("messages");
                  setMobileMenuOpen(false);
                }}
                collapsed={sidebarCollapsed}
              />
              <NavItem
                icon={<Building size={20} />}
                label="Estrutura"
                viewKey="structure"
                currentView={view}
                onClick={() => {
                  setView("structure");
                  setMobileMenuOpen(false);
                }}
                collapsed={sidebarCollapsed}
              />
              <NavItem
                icon={<AlertTriangle size={20} />}
                label="Central de Ocorrências"
                viewKey="complaints"
                currentView={view}
                onClick={() => {
                  setView("complaints");
                  setMobileMenuOpen(false);
                }}
                badge={openComplaintsCount}
                collapsed={sidebarCollapsed}
              />
            </>
          ) : (
            <NavItem
              icon={<ListChecks size={20} />}
              label="Minhas Ocorrências"
              viewKey="complaints"
              currentView={view}
              onClick={() => {
                setView("complaints");
                setMobileMenuOpen(false);
              }}
              collapsed={sidebarCollapsed}
            />
          )}
        </nav>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 p-3 border-t space-y-2 bg-card">
          <div className="flex items-center justify-center">
            <ModeToggle />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div className="text-xs text-muted-foreground mb-2 uppercase font-semibold">
                Simular Usuário
              </div>
              <Select
                value={currentUser.id}
                onValueChange={(userId) => {
                  const user = USERS.find((u) => u.id === userId);
                  if (user) setCurrentUser(user);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USERS.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {currentUser.permissionScope === "global"
                  ? "🌐 Acesso Global"
                  : "🏢 Acesso Local"}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
});
