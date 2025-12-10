import { PermissionGuard } from "@/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { TeamManagementPage } from "./pages/TeamManagementPage";

export const userManagementRoutes: FeatureRoute[] = [
  {
    path: "team",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_RESIDENTS}>
        <TeamManagementPage />
      </PermissionGuard>
    ),
  },
];
