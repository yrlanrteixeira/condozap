import { PermissionGuard } from "@/shared/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { MessagingPage } from "./pages/MessagingPage";

export const messagesRoutes: FeatureRoute[] = [
  {
    path: "messages",
    element: (
      <PermissionGuard permission={Permissions.SEND_MESSAGE}>
        <MessagingPage />
      </PermissionGuard>
    ),
  },
];

