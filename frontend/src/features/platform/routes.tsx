import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const PlatformDashboardPage = lazy(() => import("./pages/PlatformDashboardPage"));
const SyndicsPage = lazy(() => import("./pages/SyndicsPage"));

export const platformRoutes: FeatureRoute[] = [
  {
    path: "platform",
    element: (
      <PermissionGuard permission={Permissions.VIEW_PLATFORM_DASHBOARD}>
        <Suspense fallback={<PageLoader />}>
          <PlatformDashboardPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
  {
    path: "syndics",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_SYNDICS}>
        <Suspense fallback={<PageLoader />}>
          <SyndicsPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
