import { lazy, Suspense } from "react";
import {
  FirstPasswordGuard,
  PermissionGuard,
  ProtectedRoute,
} from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const UserApprovalPage = lazy(() =>
  import("./pages/UserApprovalPage").then((m) => ({
    default: m.UserApprovalPage,
  }))
);

const PendingApprovalPage = lazy(() =>
  import("@/pages/PendingApprovalPage").then((m) => ({
    default: m.PendingApprovalPage,
  }))
);

export const userApprovalRoutes: FeatureRoute[] = [
  {
    path: "user-approval",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_RESIDENTS}>
        <Suspense fallback={<PageLoader />}>
          <UserApprovalPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];

export const pendingApprovalRoute: FeatureRoute = {
  path: "/pending-approval",
  element: (
    <ProtectedRoute>
      <FirstPasswordGuard>
        <Suspense fallback={<PageLoader />}>
          <PendingApprovalPage />
        </Suspense>
      </FirstPasswordGuard>
    </ProtectedRoute>
  ),
};
