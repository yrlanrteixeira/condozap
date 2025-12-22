import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import type { View, UserRole, User, Condominium } from "@/types";
import { NOTIFICATION_DURATION_MS } from "@/shared/utils/constants";
import { useAppDispatch, useAppSelector } from "@/shared/hooks";
import {
  setView as setViewAction,
  setMobileMenuOpen as setMobileMenuOpenAction,
  setSidebarCollapsed as setSidebarCollapsedAction,
  showNotification as showNotificationAction,
  clearNotification,
  selectView,
  selectMobileMenuOpen,
  selectSidebarCollapsed,
  selectNotification,
} from "@/shared/store/slices/uiSlice";
import {
  setCurrentUser as setCurrentUserAction,
  setUserRole as setUserRoleAction,
  selectCurrentUser,
  selectUserRole,
  selectIsProfessionalSyndic,
} from "@/shared/store/slices/userSlice";
import {
  setCurrentCondominiumId as setCurrentCondominiumIdAction,
  selectCurrentCondominiumId,
  selectCurrentCondominium,
  selectAccessibleCondominiums,
} from "@/shared/store/slices/condominiumSlice";

interface AppContextType {
  view: View;
  setView: (view: View) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  notification: ReturnType<typeof selectNotification>;
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
  const dispatch = useAppDispatch();

  // Selectors
  const view = useAppSelector(selectView);
  const userRole = useAppSelector(selectUserRole);
  const mobileMenuOpen = useAppSelector(selectMobileMenuOpen);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);
  const notification = useAppSelector(selectNotification);
  const currentUser = useAppSelector(selectCurrentUser);
  const currentCondominiumId = useAppSelector(selectCurrentCondominiumId);
  const currentCondominium = useAppSelector(selectCurrentCondominium);
  const accessibleCondominiums = useAppSelector(selectAccessibleCondominiums);
  const isProfessionalSyndicFlag = useAppSelector(selectIsProfessionalSyndic);

  // Actions wrapped
  const setView = useCallback((view: View) => {
    dispatch(setViewAction(view));
  }, [dispatch]);

  const setUserRole = useCallback((role: UserRole) => {
    dispatch(setUserRoleAction(role));
  }, [dispatch]);

  const setMobileMenuOpen = useCallback((open: boolean) => {
    dispatch(setMobileMenuOpenAction(open));
  }, [dispatch]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    dispatch(setSidebarCollapsedAction(collapsed));
  }, [dispatch]);

  const showNotification = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      dispatch(showNotificationAction({ message, type }));
      setTimeout(() => dispatch(clearNotification()), NOTIFICATION_DURATION_MS);
    },
    [dispatch]
  );

  const setCurrentUser = useCallback((user: User) => {
    dispatch(setCurrentUserAction(user));
  }, [dispatch]);

  const setCurrentCondominiumId = useCallback((id: string | null) => {
    dispatch(setCurrentCondominiumIdAction(id));
  }, [dispatch]);

  const getCurrentCondominium = useCallback(() => {
    return currentCondominium;
  }, [currentCondominium]);

  const getAccessibleCondominiums = useCallback(() => {
    return accessibleCondominiums;
  }, [accessibleCondominiums]);

  const isProfessionalSyndic = useCallback(() => {
    return isProfessionalSyndicFlag;
  }, [isProfessionalSyndicFlag]);

  return (
    <AppContext.Provider
      value={{
        view,
        setView,
        userRole,
        setUserRole,
        mobileMenuOpen,
        setMobileMenuOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
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
