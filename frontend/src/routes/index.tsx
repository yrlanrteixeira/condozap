import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import {
  ApprovalGuard,
  FirstPasswordGuard,
  InitialRedirect,
  ProtectedRoute,
  PermissionGuard,
} from "@/shared/components/guards";
import { FirstAccessPage } from "@/features/auth/pages/FirstAccessPage";
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
import { platformRoutes } from "@/features/platform/routes";
import { announcementRoutes } from "@/features/announcements/routes";
import { reportRoutes } from "@/features/reports/routes";
import { sectorDashboardRoutes } from "@/features/sector-dashboard/routes";
import { billingRoutes } from "@/features/billing";
import { platformBillingRoutes } from "@/features/platform-billing";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const AccessDeniedPage = lazy(() =>
  import("@/pages/AccessDenied").then((m) => ({ default: m.AccessDeniedPage }))
);

const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

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
    ...platformRoutes,
    ...announcementRoutes,
    ...reportRoutes,
    ...sectorDashboardRoutes,
    ...billingRoutes,
    ...platformBillingRoutes,
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

      <Route
        path="/access-denied"
        element={
          <Suspense fallback={<PageLoader />}>
            <AccessDeniedPage />
          </Suspense>
        }
      />

      <Route
        path="/auth/first-access"
        element={
          <ProtectedRoute>
            <FirstAccessPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <FirstPasswordGuard>
              <ApprovalGuard>
                <MainLayout />
              </ApprovalGuard>
            </FirstPasswordGuard>
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
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            </PermissionGuard>
          }
        />

        <Route path="*" element={<InitialRedirect />} />
      </Route>
    </Routes>
  );
}
