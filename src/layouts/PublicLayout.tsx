import { Outlet, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { PublicChromeProvider } from "@/contexts/PublicChromeContext";

// Lazy load nav and footer to reduce initial JS execution time
const PremiumTopNav = lazy(() => import("@/components/home/premium/PremiumTopNav"));
const PremiumFooter = lazy(() => import("@/components/home/premium/PremiumFooter"));

// Minimal skeleton for nav to prevent layout shift
const NavSkeleton = () => (
  <>
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-2xl border-b border-border/40">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-full flex items-center">
        <div className="w-20 h-6 bg-muted/50 rounded animate-pulse" />
      </div>
    </nav>
    <div className="h-14" />
  </>
);

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

  useEffect(() => {
    const hash = location.hash || "";
    if (!hash || hash === "#") return;

    const id = decodeURIComponent(hash.slice(1));
    const el = document.getElementById(id);
    if (!el) return;

    const raf = requestAnimationFrame(() => {
      const headerOffset = 72;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    });

    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.hash]);

  const isDashboardRoute = DASHBOARD_PREFIXES.some((p) => path.startsWith(p));

  if (isDashboardRoute) return <Outlet />;

  return (
    <PublicChromeProvider value={{ headerProvided: true, footerProvided: true }}>
      <div className="min-h-screen flex flex-col bg-background">
        <Suspense fallback={<NavSkeleton />}>
          <PremiumTopNav />
        </Suspense>
        <main className="flex-1 [&_footer]:hidden">
          <Outlet />
        </main>
        <Suspense fallback={null}>
          <PremiumFooter />
        </Suspense>
      </div>
    </PublicChromeProvider>
  );
}
