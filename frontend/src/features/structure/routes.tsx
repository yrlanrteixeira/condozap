import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { StructurePage } from "./pages/StructurePage";

export const structureRoutes: FeatureRoute[] = [
  {
    path: "structure",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_STRUCTURE}>
        <StructurePage />
      </PermissionGuard>
    ),
  },
];

