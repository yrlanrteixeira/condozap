import { lazy, Suspense } from "react";
import { AnyPermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const ComplaintsPage = lazy(() =>
  import("./pages/ComplaintsPage").then((m) => ({ default: m.ComplaintsPage }))
);

export const complaintsRoutes: FeatureRoute[] = [
  {
    path: "complaints",
    element: (
      <AnyPermissionGuard
        permissions={[
          Permissions.VIEW_COMPLAINTS,
          Permissions.VIEW_OWN_COMPLAINTS,
        ]}
      >
        <Suspense fallback={<PageLoader />}>
          <ComplaintsPage />
        </Suspense>
      </AnyPermissionGuard>
    ),
  },
];
