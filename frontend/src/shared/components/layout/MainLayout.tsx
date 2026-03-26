import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NotificationToast } from "./NotificationToast";
import {
  Sheet,
  SheetContent,
} from "@/shared/components/ui/sheet";
import { useAuth } from "@/shared/hooks/useAuth";
import { useAppSelector, useCondominiumSync } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";
import { useComplaints } from "@/features/complaints/hooks/useComplaintsApi";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut",
  duration: 0.25,
};

export function MainLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Sync queries when condominium changes
  useCondominiumSync();

  const { user } = useAuth();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);

  // SUPER_ADMIN vê ocorrências globais, RESIDENT vê apenas suas, outros veem do condomínio selecionado
  const condoIdToFetch = user?.role === 'SUPER_ADMIN' ? 'all' : (currentCondominiumId || '');

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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Link de Acessibilidade - Pular para conteúdo */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded"
      >
        Pular para o conteúdo principal
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          openComplaintsCount={openComplaintsCount}
          collapsed={sidebarCollapsed}
        />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar
            openComplaintsCount={openComplaintsCount}
            collapsed={false}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {/* Page Content with transitions */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-thin bg-background"
          role="main"
          aria-label="Conteúdo principal"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Notification Toast */}
      <NotificationToast />
    </div>
  );
}
