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
  "/doctor",
  "/patient",
  "/super-admin",
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
