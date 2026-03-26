import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const CondominiumsPage = lazy(() => import("./pages/CondominiumsPage"));

export const condominiumsRoutes: FeatureRoute[] = [
  {
    path: "condominiums",
    element: (
      <PermissionGuard permission={Permissions.CREATE_CONDOMINIUM}>
        <Suspense fallback={<PageLoader />}>
          <CondominiumsPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
