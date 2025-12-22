import { ProtectedRoute, PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PendingApprovalPage } from "@/pages/PendingApprovalPage";
import { UserApprovalPage } from "./pages/UserApprovalPage";

export const userApprovalRoutes: FeatureRoute[] = [
  {
    path: "user-approval",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_RESIDENTS}>
        <UserApprovalPage />
      </PermissionGuard>
    ),
  },
];

export const pendingApprovalRoute: FeatureRoute = {
  path: "/pending-approval",
  element: (
    <ProtectedRoute>
      <PendingApprovalPage />
    </ProtectedRoute>
  ),
};
