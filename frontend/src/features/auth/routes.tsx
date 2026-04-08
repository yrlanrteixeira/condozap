import type { FeatureRoute } from "@/routes/types";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RegisterBlockedPage } from "./pages/RegisterBlockedPage";

export const authRoutes: FeatureRoute[] = [
  {
    path: "/auth/login",
    element: <LoginPage />,
  },
  {
    path: "/auth/register",
    element: <RegisterBlockedPage />,
  },
  {
    path: "/auth/register/:condoSlug",
    element: <RegisterPage />,
  },
];
