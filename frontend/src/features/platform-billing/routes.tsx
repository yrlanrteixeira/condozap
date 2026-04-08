import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const PlansPage = lazy(() =>
  import("./pages/PlansPage").then((m) => ({ default: m.PlansPage })),
);
const FinanceDashboardPage = lazy(() =>
  import("./pages/FinanceDashboardPage").then((m) => ({
    default: m.FinanceDashboardPage,
  })),
);

export const platformBillingRoutes: FeatureRoute[] = [
  {
    path: "super/planos",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_BILLING_PLATFORM}>
        <Suspense fallback={<PageLoader />}>
          <PlansPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
  {
    path: "super/financeiro",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_BILLING_PLATFORM}>
        <Suspense fallback={<PageLoader />}>
          <FinanceDashboardPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
