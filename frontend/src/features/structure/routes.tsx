import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const StructurePage = lazy(() =>
  import("./pages/StructurePage").then((m) => ({ default: m.StructurePage }))
);

export const structureRoutes: FeatureRoute[] = [
  {
    path: "structure",
    element: (
      <PermissionGuard permission={Permissions.MANAGE_STRUCTURE}>
        <Suspense fallback={<PageLoader />}>
          <StructurePage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
