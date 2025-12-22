import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { DashboardPage } from "./pages/DashboardPage";
import { UnifiedDashboardPage } from "./pages/UnifiedDashboardPage";

export const dashboardRoutes: FeatureRoute[] = [
  {
    path: "unified-dashboard",
    element: (
      <PermissionGuard permission={Permissions.VIEW_UNIFIED_DASHBOARD}>
        <UnifiedDashboardPage />
      </PermissionGuard>
    ),
  },
  {
    path: "dashboard",
    element: (
      <PermissionGuard permission={Permissions.VIEW_DASHBOARD}>
        <DashboardPage />
      </PermissionGuard>
    ),
  },
];

