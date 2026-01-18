// src/layouts/PublicLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import ModernNavbar from "@/components/home/ModernNavbar";
import PremiumFooter from "@/components/home/premium/PremiumFooter";

const DASHBOARD_PREFIXES = [
  "/dashboard",
  "/admin",
  "/staff",
  "/lab",
  "/pharmacy",
  "/imaging",
  "/patient",
  "/super-admin",

  // Doctor Dashboard Routes (No Footer)
  "/doctor-dashboard",
  "/doctor/dashboard",
];

export default function PublicLayout() {
  const location = useLocation();
  const path = location.pathname || "/";

  const isDashboardRoute = DASHBOARD_PREFIXES.some((p) => path.startsWith(p));

  // NOTE: "/doctor" And "/doctor/:slug" Are Public Routes And Should Keep PremiumFooter.
  // Only "/doctor-dashboard" And "/doctor/dashboard" Are Treated As Dashboard Routes.
  if (isDashboardRoute) return <Outlet />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ModernNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PremiumFooter />
    </div>
  );
}
