import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NotificationToast } from "./NotificationToast";
import { SubscriptionStatusBanner, HardLockOverlay } from "@/features/billing";
import {
  Sheet,
  SheetContent,
} from "@/shared/components/ui/sheet";
import { useAuth } from "@/shared/hooks/useAuth";
import { useAppSelector, useCondominiumSync } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { useComplaints } from "@/features/complaints/hooks/useComplaintsApi";

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Sync queries when condominium changes
  useCondominiumSync();

  const { user } = useAuth();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);

  // Contagem de ocorrências abertas pelo condomínio selecionado (inclui Super Admin com condomínio ativo)
  const condoIdToFetch = currentCondominiumId || "";

  const { data: complaints = [] } = useComplaints(condoIdToFetch);

  // Contar ocorrências abertas
  const openComplaintsCount = user?.role === 'RESIDENT'
    ? complaints.filter(c => c.residentId === user?.residentId && c.status === 'OPEN').length
    : complaints.filter(c => c.status === 'OPEN').length;

  // Salvar estado no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Link de Acessibilidade - Pular para conteúdo */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded"
      >
        Pular para o conteúdo principal
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          openComplaintsCount={openComplaintsCount}
          collapsed={sidebarCollapsed}
        />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent 
          side="left" 
          className="w-[85dvw] sm:w-80 p-0 bg-card h-[100dvh] sm:h-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <div className="h-full overflow-y-auto">
            <Sidebar
              openComplaintsCount={openComplaintsCount}
              collapsed={false}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {/* Billing status banner (trial expiring / grace / soft lock) */}
        <SubscriptionStatusBanner />

        {/* Page Content with transitions */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-thin bg-background"
          role="main"
          aria-label="Conteúdo principal"
        >
          <Outlet />
        </main>
      </div>

      {/* Notification Toast */}
      <NotificationToast />

      {/* Hard-lock overlay — full-screen block for severely overdue accounts */}
      <HardLockOverlay />
    </div>
  );
}
