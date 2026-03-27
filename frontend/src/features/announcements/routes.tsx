import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));

export const announcementRoutes: FeatureRoute[] = [
  {
    path: "announcements",
    element: (
      <PermissionGuard permission={Permissions.VIEW_ANNOUNCEMENTS}>
        <Suspense fallback={<PageLoader />}>
          <AnnouncementsPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
