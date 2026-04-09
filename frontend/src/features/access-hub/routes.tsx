import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const AccessHubPage = lazy(() =>
  import("./pages/AccessHubPage").then((m) => ({ default: m.AccessHubPage }))
);

export const accessHubRoutes: FeatureRoute[] = [
  {
    path: "access",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_TEAM}>
        <Suspense fallback={<PageLoader />}>
          <AccessHubPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
