import { lazy, Suspense } from "react";
import { AnyPermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const TeamManagementPage = lazy(() =>
  import("./pages/TeamManagementPage").then((m) => ({
    default: m.TeamManagementPage,
  }))
);

export const userManagementRoutes: FeatureRoute[] = [
  {
    path: "team",
    element: (
      <AnyPermissionGuard
        permissions={[Permissions.MANAGE_TEAM, Permissions.MANAGE_RESIDENTS]}
      >
        <Suspense fallback={<PageLoader />}>
          <TeamManagementPage />
        </Suspense>
      </AnyPermissionGuard>
    ),
  },
];
