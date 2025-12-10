import { PermissionGuard } from "@/components/guards";
import { Permissions } from "@/config/permissions";
import type { FeatureRoute } from "@/routes/types";
import { HistoryPage } from "./pages/HistoryPage";

export const historyRoutes: FeatureRoute[] = [
  {
    path: "history",
    element: (
      <PermissionGuard permission={Permissions.VIEW_HISTORY}>
        <HistoryPage />
      </PermissionGuard>
    ),
  },
];

