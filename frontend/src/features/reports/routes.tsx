import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const ReportsPage = lazy(() => import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));

export const reportRoutes: FeatureRoute[] = [
  {
    path: "reports",
    element: (
      <PermissionGuard permission={Permissions.VIEW_REPORTS}>
        <Suspense fallback={<PageLoader />}>
          <ReportsPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
