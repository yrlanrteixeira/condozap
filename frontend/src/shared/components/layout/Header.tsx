import { useEffect } from "react";
import { Menu, PanelLeftClose, PanelLeft, Building2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ModeToggle } from "@/shared/components/mode-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useAuth } from "@/shared/hooks/useAuth";
import { useAppSelector, useAppDispatch } from "@/shared/hooks";
import {
  selectCurrentCondominiumId,
  selectCondominiums,
  setCurrentCondominium,
} from "@/shared/store/slices/condominiumSlice";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

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

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // SUPER_ADMIN não opera dentro de condomínios — não tem seletor.
  // Apenas síndicos/funcionários/moradores com mais de um vínculo veem o seletor.
  const condominiumsToShow = userCondominiums;
  const showCondominiumSelector =
    !isSuperAdmin && condominiumsToShow.length > 1;

  // Auto-selecionar primeiro condomínio se nenhum está selecionado
  useEffect(() => {
    if (!currentCondominiumId && !isSuperAdmin && userCondominiums.length > 0) {
      dispatch(setCurrentCondominium(userCondominiums[0].id));
    }
  }, [currentCondominiumId, isSuperAdmin, userCondominiums, dispatch]);

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
        <NotificationBell />
        <ModeToggle />
      </div>
    </header>
  );
};
