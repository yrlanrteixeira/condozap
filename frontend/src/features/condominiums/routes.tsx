import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { CondominiumsPage } from "./pages/CondominiumsPage";

export const condominiumsRoutes: FeatureRoute[] = [
  {
    path: "condominiums",
    element: (
      <PermissionGuard permission={Permissions.CREATE_CONDOMINIUM}>
        <CondominiumsPage />
      </PermissionGuard>
    ),
  },
];

