import { lazy, Suspense } from "react";
import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { PageLoader } from "@/shared/components/ui/page-loader";

const MessagingPage = lazy(() => import("./pages/MessagingPage").then((m) => ({ default: m.MessagingPage })));

export const messagesRoutes: FeatureRoute[] = [
  {
    path: "messages",
    element: (
      <PermissionGuard permission={Permissions.SEND_MESSAGE}>
        <Suspense fallback={<PageLoader />}>
          <MessagingPage />
        </Suspense>
      </PermissionGuard>
    ),
  },
];
