import { Routes, Route } from "react-router-dom";
import {
  ProtectedRoute,
  PermissionGuard,
  InitialRedirect,
  ApprovalGuard,
} from "@/components/guards";
import { MainLayout } from "@/components/layout";
import { Permissions } from "@/config/permissions";

// Auth Pages
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";

// Dashboard Pages
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { UnifiedDashboardPage } from "@/features/dashboard/pages/UnifiedDashboardPage";

// Messages Pages
import { MessagingPage } from "@/features/messages/pages/MessagingPage";

// Residents Pages
import { ResidentsPage } from "@/features/residents/pages/ResidentsPage";

// Structure Pages
import { StructurePage } from "@/features/structure/pages/StructurePage";

// Complaints Pages
import { ComplaintsPage } from "@/features/complaints/pages/ComplaintsPage";

// History Pages
import { HistoryPage } from "@/features/history/pages/HistoryPage";

// Settings Page
import { SettingsPage } from "@/pages/SettingsPage";

// Approval Pages
import { PendingApprovalPage } from "@/pages/PendingApprovalPage";
import { UserApprovalPage } from "@/features/user-approval";

// User Management Pages
import { TeamManagementPage } from "@/features/user-management";

// Access Denied Page
import { AccessDeniedPage } from "@/pages/AccessDenied";

export function AppRoutes() {
  return (
    <Routes>
        {/* Public Routes */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />

        {/* Redirect old /login to /auth/login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Pending Approval - Protected but no ApprovalGuard */}
        <Route
          path="/pending-approval"
          element={
            <ProtectedRoute>
              <PendingApprovalPage />
            </ProtectedRoute>
          }
        />

        {/* Access Denied */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Protected Routes with Layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <ApprovalGuard>
                <MainLayout />
              </ApprovalGuard>
            </ProtectedRoute>
          }
        >
          {/* Root - Redirect based on user role */}
          <Route index element={<InitialRedirect />} />

          {/* Unified Dashboard - Professional Syndics & Super Admins only */}
          <Route
            path="unified-dashboard"
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
            path="dashboard"
            element={
              <PermissionGuard permission={Permissions.VIEW_DASHBOARD}>
                <DashboardPage />
              </PermissionGuard>
            }
          />

          {/* Messages */}
          <Route
            path="messages"
            element={
              <PermissionGuard permission={Permissions.SEND_MESSAGE}>
                <MessagingPage />
              </PermissionGuard>
            }
          />

          {/* Residents */}
          <Route
            path="residents"
            element={
              <PermissionGuard permission={Permissions.VIEW_RESIDENTS}>
                <ResidentsPage />
              </PermissionGuard>
            }
          />

          {/* User Approval - Admins and Syndics only */}
          <Route
            path="user-approval"
            element={
              <PermissionGuard permission={Permissions.MANAGE_RESIDENTS}>
                <UserApprovalPage />
              </PermissionGuard>
            }
          />

          {/* Team Management - Syndics and Admins */}
          <Route
            path="team"
            element={
              <PermissionGuard permission={Permissions.MANAGE_RESIDENTS}>
                <TeamManagementPage />
              </PermissionGuard>
            }
          />

          {/* Structure */}
          <Route
            path="structure"
            element={
              <PermissionGuard permission={Permissions.MANAGE_STRUCTURE}>
                <StructurePage />
              </PermissionGuard>
            }
          />

          {/* Complaints */}
          <Route
            path="complaints"
            element={
              <PermissionGuard permission={Permissions.VIEW_COMPLAINTS}>
                <ComplaintsPage />
              </PermissionGuard>
            }
          />

          {/* History */}
          <Route
            path="history"
            element={
              <PermissionGuard permission={Permissions.VIEW_HISTORY}>
                <HistoryPage />
              </PermissionGuard>
            }
          />

          {/* Settings */}
          <Route
            path="settings"
            element={
              <PermissionGuard permission={Permissions.VIEW_SETTINGS}>
                <SettingsPage />
              </PermissionGuard>
            }
          />

          {/* Fallback - Redirect based on user role */}
          <Route path="*" element={<InitialRedirect />} />
        </Route>
      </Routes>
  );
}
