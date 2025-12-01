import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NotificationToast } from "./NotificationToast";

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // TODO: Implementar mobile menu
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Recuperar estado salvo no localStorage
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Salvar estado no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // TODO: Buscar contagem real de ocorrências abertas da API
  const openComplaintsCount = 0;

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

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header (Desktop e Mobile) */}
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-background p-4 md:p-6"
          role="main"
          aria-label="Conteúdo principal"
        >
          <Outlet />
        </main>
      </div>

      {/* Notification Toast */}
      <NotificationToast />
    </div>
  );
}
