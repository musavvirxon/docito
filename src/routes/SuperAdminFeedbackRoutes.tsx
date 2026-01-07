import { lazy, Suspense } from "react";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";

const SuperAdminFeedbackInbox = lazy(() => import("@/pages/SuperAdminFeedbackInbox"));

// Export the route element directly for use in App.tsx
export const SuperAdminFeedbackElement = (
  <RoleProtectedRoute allowedRoles={["super_admin"]}>
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuperAdminFeedbackInbox />
    </Suspense>
  </RoleProtectedRoute>
);
