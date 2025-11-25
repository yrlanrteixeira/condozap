import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { View, UserRole, Notification } from "@/types";
import { NOTIFICATION_DURATION_MS } from "@/utils/constants";

interface AppContextType {
  view: View;
  setView: (view: View) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  notification: Notification | null;
  showNotification: (message: string, type?: "success" | "error") => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("dashboard");
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), NOTIFICATION_DURATION_MS);
    },
    []
  );

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
