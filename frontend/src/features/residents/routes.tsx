import { PermissionGuard } from "@/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { ResidentsPage } from "./pages/ResidentsPage";

export const residentsRoutes: FeatureRoute[] = [
  {
    path: "residents",
    element: (
      <PermissionGuard permission={Permissions.VIEW_RESIDENTS}>
        <ResidentsPage />
      </PermissionGuard>
    ),
  },
];

