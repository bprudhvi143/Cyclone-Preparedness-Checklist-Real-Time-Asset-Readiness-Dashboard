import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "../contexts/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";

// Import all pages
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ZonesPage from "../pages/ZonesPage";
import WardsPage from "../pages/WardsPage";
import SheltersPage from "../pages/SheltersPage";
import AssetsPage from "../pages/AssetsPage";
import ChecklistSubmitPage from "../pages/ChecklistSubmitPage";
import ChecklistHistoryPage from "../pages/ChecklistHistoryPage";
import AlertsPage from "../pages/AlertsPage";
import ReportsPage from "../pages/ReportsPage";
import UsersPage from "../pages/UsersPage";
import SettingsPage from "../pages/SettingsPage";
import { NotFoundPage, UnauthorizedPage } from "../pages/ErrorPages";

// Route Guard: Verify Authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-gray">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Route Guard: Verify Role Authorization
const RoleRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-gray">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Area Layout Wrapper */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    {/* Role-based redirection from base path */}
                    <Route
                      path=""
                      element={
                        <NavigateToDashboard />
                      }
                    />

                    {/* Common Protected Routes */}
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="shelters" element={<SheltersPage />} />
                    <Route path="assets" element={<AssetsPage />} />
                    <Route path="checklists/history" element={<ChecklistHistoryPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="settings" element={<SettingsPage />} />

                    {/* Field Officer Workflow */}
                    <Route
                      path="checklists/submit"
                      element={
                        <RoleRoute allowedRoles={["FIELD_OFFICER", "ADMIN"]}>
                          <ChecklistSubmitPage />
                        </RoleRoute>
                      }
                    />

                    {/* Admin / Commissioner Routes */}
                    <Route
                      path="zones"
                      element={
                        <RoleRoute allowedRoles={["ADMIN", "COMMISSIONER"]}>
                          <ZonesPage />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="wards"
                      element={
                        <RoleRoute allowedRoles={["ADMIN", "COMMISSIONER"]}>
                          <WardsPage />
                        </RoleRoute>
                      }
                    />

                    {/* Zone Officer / Commissioner Reports */}
                    <Route
                      path="reports"
                      element={
                        <RoleRoute allowedRoles={["ADMIN", "COMMISSIONER", "ZONE_OFFICER"]}>
                          <ReportsPage />
                        </RoleRoute>
                      }
                    />

                    {/* Admin Only Routes */}
                    <Route
                      path="users"
                      element={
                        <RoleRoute allowedRoles={["ADMIN"]}>
                          <UsersPage />
                        </RoleRoute>
                      }
                    />

                    {/* 404 fallback */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Helper component to redirect / to the correct starting page based on role
const NavigateToDashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "FIELD_OFFICER") {
    return <Navigate to="/checklists/submit" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export default AppRoutes;
