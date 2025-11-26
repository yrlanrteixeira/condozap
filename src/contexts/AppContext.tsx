import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { View, UserRole, Notification, User, Condominium } from "@/types";
import { NOTIFICATION_DURATION_MS } from "@/utils/constants";
import { USERS, CONDOMINIUMS } from "@/data/multiCondoMockData";

interface AppContextType {
  view: View;
  setView: (view: View) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  notification: Notification | null;
  showNotification: (message: string, type?: "success" | "error") => void;
  // Multi-condo support
  currentUser: User;
  setCurrentUser: (user: User) => void;
  currentCondominiumId: string | null;
  setCurrentCondominiumId: (id: string | null) => void;
  getCurrentCondominium: () => Condominium | null;
  getAccessibleCondominiums: () => Condominium[];
  isProfessionalSyndic: () => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("dashboard");
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Multi-condo state
  const [currentUser, setCurrentUser] = useState<User>(USERS[0]); // Síndico Profissional por padrão
  const [currentCondominiumId, setCurrentCondominiumId] = useState<string | null>('condo-1');

  const showNotification = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), NOTIFICATION_DURATION_MS);
    },
    []
  );

  const getCurrentCondominium = useCallback(() => {
    if (!currentCondominiumId) return null;
    return CONDOMINIUMS.find(c => c.id === currentCondominiumId) || null;
  }, [currentCondominiumId]);

  const getAccessibleCondominiums = useCallback(() => {
    return CONDOMINIUMS.filter(c => currentUser.condominiumIds.includes(c.id));
  }, [currentUser]);

  const isProfessionalSyndic = useCallback(() => {
    return currentUser.role === 'professional_syndic' && currentUser.permissionScope === 'global';
  }, [currentUser]);

  // Sincronizar userRole com currentUser.role
  useEffect(() => {
    setUserRole(currentUser.role);
  }, [currentUser]);

  return (
    <AppContext.Provider
      value={{
        view,
        setView,
        userRole,
        setUserRole,
        mobileMenuOpen,
        setMobileMenuOpen,
        notification,
        showNotification,
        currentUser,
        setCurrentUser,
        currentCondominiumId,
        setCurrentCondominiumId,
        getCurrentCondominium,
        getAccessibleCondominiums,
        isProfessionalSyndic,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
