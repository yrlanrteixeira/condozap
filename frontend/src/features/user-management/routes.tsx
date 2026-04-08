import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
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
      // Team management is síndico-only per spec 2026-03-26. ADMIN
      // (Conselheiro) cannot manage other management-level users.
      <PermissionGuard permission={Permissions.MANAGE_TEAM}>
        <Suspense fallback={<PageLoader />}>
          <TeamManagementPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
