import { AnyPermissionGuard } from "@/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { ComplaintsPage } from "./pages/ComplaintsPage";

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
        <ComplaintsPage />
      </AnyPermissionGuard>
    ),
  },
];

