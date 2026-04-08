import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const SubscriptionPage = lazy(() =>
  import("./pages/SubscriptionPage").then((m) => ({ default: m.SubscriptionPage })),
);

export const billingRoutes: FeatureRoute[] = [
  {
    path: "assinatura",
    element: (
      <PermissionGuard permission={Permissions.VIEW_BILLING}>
        <Suspense fallback={<PageLoader />}>
          <SubscriptionPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
