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

  // Doctor DASHBOARD routes (keep footer off)
  "/doctor-dashboard",
  "/doctor/dashboard",
];

export default function PublicLayout() {
  const location = useLocation();
  const path = location.pathname || "/";

  const isDashboardRoute = DASHBOARD_PREFIXES.some((p) => path.startsWith(p));

  // NOTE: /doctor and /doctor/:slug are PUBLIC routes and should keep PremiumFooter.
  // Only /doctor-dashboard and /doctor/dashboard are treated as dashboard routes.
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
