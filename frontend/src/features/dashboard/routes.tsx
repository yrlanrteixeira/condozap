import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UnifiedDashboardPage = lazy(() => import("./pages/UnifiedDashboardPage"));

export const dashboardRoutes: FeatureRoute[] = [
  {
    path: "unified-dashboard",
    element: (
      <PermissionGuard permission={Permissions.VIEW_UNIFIED_DASHBOARD}>
        <Suspense fallback={<PageLoader />}>
          <UnifiedDashboardPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
  {
    path: "dashboard",
    element: (
      <PermissionGuard permission={Permissions.VIEW_DASHBOARD}>
        <Suspense fallback={<PageLoader />}>
          <DashboardPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
