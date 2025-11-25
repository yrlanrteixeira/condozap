import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header = ({
  onMenuClick,
  sidebarCollapsed = false,
  onToggleSidebar,
}: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Desktop Sidebar Toggle Button */}
      {onToggleSidebar && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expandir menu" : "Minimizar menu"}
          title={sidebarCollapsed ? "Expandir menu" : "Minimizar menu"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Page Title - Empty for now */}
      <div className="flex-1">
        {/* Pode adicionar breadcrumbs ou título da página aqui */}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
};
