import { lazy } from "react";
import { Route } from "react-router-dom";
import RoleProtectedRoute from "@/components/auth/RoleProtectedRoute";

// Lazy page
const SuperAdminFeedbackInbox = lazy(() => import("@/pages/SuperAdminFeedbackInbox"));

/**
 * Drop this component INSIDE your <Routes> ... </Routes> in App.tsx
 * It registers BOTH:
 * - /super-admin/feedback
 * - /:lang/super-admin/feedback
 */
export default function SuperAdminFeedbackRoutes() {
  return (
    <>
      {/* Non-localized */}
      <Route
        path="/super-admin/feedback"
        element={
          <RoleProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminFeedbackInbox />
          </RoleProtectedRoute>
        }
      />

      {/* Localized */}
      <Route
        path="/:lang/super-admin/feedback"
        element={
          <RoleProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminFeedbackInbox />
          </RoleProtectedRoute>
        }
      />
    </>
  );
}
