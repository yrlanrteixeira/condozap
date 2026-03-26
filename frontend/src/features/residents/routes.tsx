import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const ResidentsPage = lazy(() =>
  import("./pages/ResidentsPage").then((m) => ({ default: m.ResidentsPage }))
);

export const residentsRoutes: FeatureRoute[] = [
  {
    path: "residents",
    element: (
      <PermissionGuard permission={Permissions.VIEW_RESIDENTS}>
        <Suspense fallback={<PageLoader />}>
          <ResidentsPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
