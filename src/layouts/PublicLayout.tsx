// src/layouts/PublicLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import PremiumFooter from "@/components/home/premium/PremiumFooter";
import PremiumTopNav from "@/components/home/premium/PremiumTopNav";
import { PublicChromeProvider } from "@/contexts/PublicChromeContext";

const DASHBOARD_PREFIXES = [
  "/dashboard",
  "/patient-dashboard",
  "/doctor-dashboard",
  "/staff-dashboard",
  "/admin-dashboard",
  "/super-admin-dashboard",
  "/patient/dashboard",
  "/doctor/dashboard",
  "/staff/dashboard",
  "/admin/dashboard",
  "/super-admin/dashboard",
  "/lab/dashboard",
  "/pharmacy/dashboard",
  "/imaging/dashboard",
  "/lab/verification",
  "/pharmacy/verification",
  "/imaging/verification",
  "/lab/settings",
  "/pharmacy/settings",
  "/imaging/settings",
  "/lab/register",
  "/pharmacy/register",
  "/imaging/register",
];

export default function PublicLayout() {
  const location = useLocation();
  const path = location.pathname || "/";

  const isDashboardRoute = DASHBOARD_PREFIXES.some((p) => path.startsWith(p));

  // Lab public landing page: no footer per requirement.
  const hideFooter = path === "/lab";

  if (isDashboardRoute) return <Outlet />;

  return (
    <PublicChromeProvider value={{ headerProvided: true, footerProvided: !hideFooter }}>
      <div className="min-h-screen flex flex-col bg-background">
        <PremiumTopNav />

        {/* If /lab has any inline <footer> tags inside its page, hide them too */}
        <main className={hideFooter ? "flex-1 [&_footer]:hidden" : "flex-1"}>
          <Outlet />
        </main>

        {!hideFooter ? <PremiumFooter /> : null}
      </div>
    </PublicChromeProvider>
  );
}
