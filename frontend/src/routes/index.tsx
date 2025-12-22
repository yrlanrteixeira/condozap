import { Routes, Route } from "react-router-dom";
import { ApprovalGuard, InitialRedirect, ProtectedRoute, PermissionGuard } from "@/shared/components/guards";
import { MainLayout } from "@/shared/components/layout";
import { Permissions } from "@/config/permissions";
import { authRoutes } from "@/features/auth/routes";
import { complaintsRoutes } from "@/features/complaints/routes";
import { condominiumsRoutes } from "@/features/condominiums/routes";
import { dashboardRoutes } from "@/features/dashboard/routes";
import { historyRoutes } from "@/features/history/routes";
import { messagesRoutes } from "@/features/messages/routes";
import { residentsRoutes } from "@/features/residents/routes";
import { structureRoutes } from "@/features/structure/routes";
import { pendingApprovalRoute, userApprovalRoutes } from "@/features/user-approval/routes";
import { userManagementRoutes } from "@/features/user-management/routes";
import type { FeatureRoute } from "@/routes/types";
import { AccessDeniedPage } from "@/pages/AccessDenied";
import { SettingsPage } from "@/pages/SettingsPage";

export function AppRoutes() {
  const protectedRoutes: FeatureRoute[] = [
    ...dashboardRoutes,
    ...messagesRoutes,
    ...residentsRoutes,
    ...userApprovalRoutes,
    ...userManagementRoutes,
    ...condominiumsRoutes,
    ...structureRoutes,
    ...complaintsRoutes,
    ...historyRoutes,
  ];

  return (
    <Routes>
      {authRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}

      <Route
        path={pendingApprovalRoute.path}
        element={pendingApprovalRoute.element}
      />

      <Route path="/access-denied" element={<AccessDeniedPage />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ApprovalGuard>
              <MainLayout />
            </ApprovalGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<InitialRedirect />} />

        {protectedRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={route.element}
          />
        ))}

        <Route
          path="settings"
          element={
            <PermissionGuard permission={Permissions.VIEW_SETTINGS}>
              <SettingsPage />
            </PermissionGuard>
          }
        />

        <Route path="*" element={<InitialRedirect />} />
      </Route>
    </Routes>
  );
}
