import { Outlet, useLocation } from "react-router-dom";
import ModernNavbar from "@/components/home/ModernNavbar";
import Footer from "@/components/Footer";

// Pages that should NOT show public footer/navbar
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

  // Safety: if someone accidentally renders this layout for dashboards, hide footer/navbar.
  if (isDashboardRoute) return <Outlet />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ModernNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
