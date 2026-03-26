import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const HistoryPage = lazy(() => import("./pages/HistoryPage"));

export const historyRoutes: FeatureRoute[] = [
  {
    path: "history",
    element: (
      <PermissionGuard permission={Permissions.VIEW_HISTORY}>
        <Suspense fallback={<PageLoader />}>
          <HistoryPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
