import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  ProtectedRoute,
  PermissionGuard,
  InitialRedirect,
} from "@/components/guards";
import { Permissions } from "@/config/permissions";

// Auth Pages
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";

// Dashboard Pages
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { UnifiedDashboardPage } from "@/features/dashboard/pages/UnifiedDashboardPage";

// Access Denied Page
import { AccessDeniedPage } from "@/pages/AccessDenied";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />

        {/* Redirect old /login to /auth/login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Access Denied */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Routes>
                {/* Root - Redirect based on user role */}
                <Route path="/" element={<InitialRedirect />} />

                {/* Unified Dashboard - Professional Syndics & Super Admins only */}
                <Route
                  path="/unified-dashboard"
                  element={
                    <PermissionGuard
                      permission={Permissions.VIEW_UNIFIED_DASHBOARD}
                    >
                      <UnifiedDashboardPage />
                    </PermissionGuard>
                  }
                />

                {/* Dashboard - All management levels */}
                <Route
                  path="/dashboard"
                  element={
                    <PermissionGuard permission={Permissions.VIEW_DASHBOARD}>
                      <DashboardPage />
                    </PermissionGuard>
                  }
                />

                {/* Fallback - Redirect based on user role */}
                <Route path="*" element={<InitialRedirect />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
