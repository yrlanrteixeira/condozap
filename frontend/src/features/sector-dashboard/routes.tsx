import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

// TODO: Full implementation in Task 9
const SectorDashboardPage = lazy(() => import("./pages/SectorDashboardPage"));

export const sectorDashboardRoutes: FeatureRoute[] = [
  {
    path: "sector-dashboard",
    element: (
      <PermissionGuard permission={Permissions.VIEW_SECTOR_DASHBOARD}>
        <Suspense fallback={<PageLoader />}>
          <SectorDashboardPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
