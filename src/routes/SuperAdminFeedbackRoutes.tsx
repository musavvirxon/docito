import { lazy } from "react";
import { Route } from "react-router-dom";
import RoleProtectedRoute from "@/components/auth/RoleProtectedRoute";

const SuperAdminFeedbackInbox = lazy(() => import("@/pages/SuperAdminFeedbackInbox"));

export default function SuperAdminFeedbackRoutes() {
  return (
    <Route
      path="/super-admin/feedback"
      element={
        <RoleProtectedRoute allowedRoles={["super_admin"]}>
          <SuperAdminFeedbackInbox />
        </RoleProtectedRoute>
      }
    />
  );
}
