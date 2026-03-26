import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/shared/hooks/useAuth";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { Permissions } from "@/config/permissions";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Send,
  Building,
  Building2,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { Separator } from "@/shared/components/ui/separator";
import { Badge } from "@/shared/components/ui/badge";
import { Logo } from "@/shared/components/Logo";

interface SubNavItem {
  title: string;
  href: string;
  permission?: string;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  subItems?: SubNavItem[];
  badge?: number;
}

interface SidebarProps {
  collapsed?: boolean;
  openComplaintsCount?: number;
  onNavigate?: () => void;
}

export const Sidebar = ({
  collapsed = false,
  openComplaintsCount = 0,
  onNavigate,
}: SidebarProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: Permissions.VIEW_DASHBOARD,
    },
    {
      title: "Enviar Mensagens",
      href: "/messages",
      icon: Send,
      permission: Permissions.SEND_MESSAGE,
    },
    {
      title: "Moradores",
      href: "/residents",
      icon: Users,
      permission: Permissions.VIEW_RESIDENTS,
    },
    {
      title: "Aprovação de Cadastros",
      href: "/user-approval",
      icon: UserCheck,
      permission: Permissions.MANAGE_RESIDENTS,
    },
    {
      title: "Conselheiros",
      href: "/team",
      icon: UsersRound,
      permission: Permissions.MANAGE_RESIDENTS,
    },
    {
      title: "Condomínios",
      href: "/condominiums",
      icon: Building2,
      permission: Permissions.CREATE_CONDOMINIUM,
    },
    {
      title: "Estrutura",
      href: "/structure",
      icon: Building,
      permission: Permissions.MANAGE_STRUCTURE,
    },
    {
      title: "Ocorrências",
      href: "/complaints",
      icon: AlertTriangle,
      // Both admins (VIEW_COMPLAINTS) and residents (VIEW_OWN_COMPLAINTS) can access
      badge: openComplaintsCount,
    },
  ];

  const bottomNavItems: NavItem[] = [
    {
      title: "Configurações",
      href: "/settings",
      icon: Settings,
      permission: Permissions.VIEW_SETTINGS,
    },
  ];

  const isActive = useCallback(
    (path: string) =>
      location.pathname === path || location.pathname.startsWith(path + "/"),
    [location.pathname]
  );

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Inicializar e manter menus expandidos baseado na rota atual
  useEffect(() => {
    const initializeOpenMenus = () => {
      const newOpenMenus: Record<string, boolean> = {};
      navItems.forEach((item) => {
        if (item.subItems && item.subItems.length > 0) {
          // Verificar se algum subitem está ativo
          const isAnySubItemActive = item.subItems.some((sub) =>
            isActive(sub.href)
          );
          if (isAnySubItemActive) {
            newOpenMenus[item.title] = true;
          }
        }
      });
      // Manter os menus já abertos manualmente pelo usuário
      setOpenMenus((prev) => ({
        ...newOpenMenus,
        ...prev,
      }));
    };

    initializeOpenMenus();
  }, [location.pathname, isActive]);

  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true;

    // Special case for Complaints: both VIEW_COMPLAINTS and VIEW_OWN_COMPLAINTS should show it
    if (item.href === "/complaints") {
      return (
        can(Permissions.VIEW_COMPLAINTS) || can(Permissions.VIEW_OWN_COMPLAINTS)
      );
    }

    return can(item.permission);
  });

  const filteredBottomNavItems = bottomNavItems.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  const getUserInitials = () => {
    if (!user?.name) return "U";
    const names = user.name.split(" ");
    if (names.length >= 2 && names[0] && names[1]) {
      return `${names[0][0]?.toUpperCase() || "U"}${names[1][0]?.toUpperCase() || "U"}`;
    }
    if (names[0] && names[0][0]) {
      return names[0][0].toUpperCase();
    }
    return "U".toUpperCase();
  };

  const getRoleLabel = () => {
    if (!user?.role) return "Usuário";
    switch (user.role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "PROFESSIONAL_SYNDIC":
        return "Síndico Profissional";
      case "ADMIN":
        return "Administrador";
      case "SYNDIC":
        return "Síndico";
      case "RESIDENT":
        return "Morador";
      default:
        return "Usuário";
    }
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r bg-card text-card-foreground transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center px-6 border-b">
        {collapsed ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
            TZ
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Logo className="h-28 w-auto" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isMenuOpen = openMenus[item.title];
          const isAnySubItemActive =
            hasSubItems && item.subItems
              ? item.subItems.some((sub) => isActive(sub.href))
              : false;

          // Se tem subitens, renderiza o menu expansível
          if (hasSubItems) {
            return (
              <div key={item.title}>
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isAnySubItemActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">
                        {item.title}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                      {isMenuOpen ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </>
                  )}
                  {collapsed && item.badge !== undefined && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </button>
                {/* Subitens */}
                {isMenuOpen && !collapsed && item.subItems && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-border pl-3">
                    {item.subItems.map((subItem) => {
                      const isSubActive = isActive(subItem.href);
                      // Verificar permissão do subitem
                      if (subItem.permission && !can(subItem.permission)) {
                        return null;
                      }
                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                            isSubActive
                              ? "bg-primary font-medium text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{subItem.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Item sem submenu
          if (!item.href) return null;

          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.title}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
              {collapsed && item.badge !== undefined && item.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="space-y-1 px-3 py-4">
        <Separator className="mb-4" />
        {filteredBottomNavItems.map((item) => {
          if (!item.href) return null;
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </div>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg bg-accent p-3",
            collapsed && "flex-col"
          )}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {getUserInitials()}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">
                  {user?.name || "Usuário"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {getRoleLabel()}
                </p>
              </div>
              <button
                onClick={logout}
                className="rounded-md p-1.5 transition-colors hover:bg-destructive hover:text-destructive-foreground"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
          {collapsed && (
            <button
              onClick={logout}
              className="w-full rounded-md p-1.5 transition-colors hover:bg-destructive hover:text-destructive-foreground"
              title="Sair"
            >
              <LogOut className="mx-auto h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
