import { Menu, PanelLeftClose, PanelLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useAppSelector, useAppDispatch } from "@/hooks";
import {
  selectCurrentCondominiumId,
  selectCondominiums,
  setCurrentCondominium,
} from "@/store/slices/condominiumSlice";
import { useCondominiums } from "@/features/condominiums/hooks/useCondominiumsApi";

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
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const userCondominiums = useAppSelector(selectCondominiums);

  // SUPER_ADMIN pode ver todos os condomínios
  const { data: allCondominiums = [] } = useCondominiums();

  const condominiumsToShow =
    user?.role === "SUPER_ADMIN" ? allCondominiums : userCondominiums;

  // Mostra o seletor para SUPER_ADMIN ou para usuários com múltiplos condomínios
  const showCondominiumSelector =
    condominiumsToShow.length > 1 || (user?.role === "SUPER_ADMIN" && condominiumsToShow.length > 0);

  const handleCondominiumChange = (condoId: string) => {
    dispatch(setCurrentCondominium(condoId));
  };

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

      {/* Condominium Selector for SUPER_ADMIN */}
      {showCondominiumSelector && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select
            value={currentCondominiumId || undefined}
            onValueChange={handleCondominiumChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um condomínio" />
            </SelectTrigger>
            <SelectContent>
              {condominiumsToShow.map((condo) => (
                <SelectItem key={condo.id} value={condo.id}>
                  {condo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Page Title - Empty for now */}
      <div className="flex-1">
        {/* Pode adicionar breadcrumbs ou título da página aqui */}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        <ModeToggle />
      </div>
    </header>
  );
};
