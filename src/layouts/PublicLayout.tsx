import { Outlet, useLocation } from "react-router-dom";
import ModernNavbar from "@/components/home/ModernNavbar";
import ModernFooter from "@/components/home/PremiumFooter";

const DASHBOARD_PREFIXES = [
  "/dashboard",
  "/super-admin-dashboard",
  "/admin-dashboard",
  "/doctor-dashboard",
  "/patient-dashboard",
  "/staff-dashboard",
  "/lab/dashboard",
  "/pharmacy/dashboard",
  "/imaging/dashboard",
];

export default function PublicLayout() {
  const location = useLocation();

  const isDashboardRoute = DASHBOARD_PREFIXES.some((p) =>
    location.pathname.startsWith(p)
  );

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
