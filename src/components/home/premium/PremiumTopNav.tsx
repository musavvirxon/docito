// src/components/home/premium/PremiumTopNav.tsx
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";

// Lazy load mobile menu to avoid loading framer-motion on initial render
const MobileMenu = lazy(() => import("./MobileMenu"));

type NavKey =
  | "doctors"
  | "clinics"
  | "labs"
  | "pharmacies"
  | "imaging"
  | "hospitals"
  | "pricing";

const PremiumTopNav = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("common");
  const { getLocalizedPath } = useLocalizedPath();

  const { user } = useAuth();

  useEffect(() => {
    // Trigger CSS animation after mount
    requestAnimationFrame(() => setNavVisible(true));
    
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = useMemo(
    () =>
      [
        { key: "doctors" as const, href: "/doctor" },
        { key: "clinics" as const, href: "/practice" },
        { key: "labs" as const, href: "/lab" },
        { key: "pharmacies" as const, href: "/pharmacy" },
        { key: "imaging" as const, href: "/imaging-center" },
        { key: "hospitals" as const, href: "/practice" },
        { key: "pricing" as const, href: "/pricing" },
      ],
    []
  );

  const isActive = (href: string) => {
    const path = location.pathname;
    return path === href || path.startsWith(`${href}/`);
  };

  const labelFor = (key: NavKey) =>
    t(`topNav.links.${key}`, {
      defaultValue:
        key === "doctors"
          ? "Doctors"
          : key === "clinics"
          ? "Clinics"
          : key === "labs"
          ? "Labs"
          : key === "pharmacies"
          ? "Pharmacies"
          : key === "imaging"
          ? "Imaging"
          : key === "hospitals"
          ? "Hospitals"
          : "Pricing",
    });

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          navVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        } ${
          isScrolled
            ? "bg-background/80 backdrop-blur-2xl border-b border-border/40 shadow-sm"
            : "bg-transparent"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo - use picture for WebP with PNG fallback */}
            <Link
              to={getLocalizedPath("/")}
              className="flex items-center hover:opacity-70 transition-opacity duration-200 flex-shrink-0"
            >
              <picture>
                <source
                  srcSet="/logos/horizontal/docito-horizontal-sm.webp"
                  type="image/webp"
                  width={80}
                  height={24}
                />
                <img
                  src="/logos/horizontal/docito-horizontal-sm.png"
                  alt="Docito"
                  className="h-6 w-auto"
                  width={80}
                  height={24}
                  fetchPriority="high"
                  decoding="sync"
                  loading="eager"
                  style={{ aspectRatio: '80/24' }}
                />
              </picture>
            </Link>

            {/* Desktop Navigation - Horizontal */}
            <div className="hidden lg:flex items-center justify-center flex-1 mx-4">
              <div className="flex items-center gap-1">
                {navLinks.map((link) => {
                  const href = getLocalizedPath(link.href);
                  return (
                    <Link
                      key={link.key}
                      to={href}
                      className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                        isActive(href)
                          ? "text-primary bg-primary/10"
                          : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      {labelFor(link.key)}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Section (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              {user ? (
                <ProfileMenu />
              ) : (
                <>
                  <Button
                    onClick={() => navigate(getLocalizedPath("/auth"))}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-4 text-xs font-medium"
                  >
                    {t("topNav.actions.signIn", { defaultValue: "Sign In" })}
                  </Button>
                  <Button
                    onClick={() => navigate(getLocalizedPath("/auth?mode=register"))}
                    size="sm"
                    className="h-8 px-4 text-xs font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {t("topNav.actions.register", { defaultValue: "Register" })}
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              {user ? <ProfileMenu compact /> : null}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label={
                  isMobileMenuOpen
                    ? t("topNav.a11y.closeMenu", { defaultValue: "Close menu" })
                    : t("topNav.a11y.openMenu", { defaultValue: "Open menu" })
                }
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Lazy loaded */}
        {isMobileMenuOpen && (
          <Suspense fallback={null}>
            <MobileMenu
              navLinks={navLinks}
              labelFor={labelFor}
              isActive={isActive}
              user={user}
              onClose={() => setIsMobileMenuOpen(false)}
              getLocalizedPath={getLocalizedPath}
              t={t}
            />
          </Suspense>
        )}
      </nav>

      {/* Spacer to prevent content from hiding under fixed nav */}
      <div className="h-14" />
    </>
  );
};

export default PremiumTopNav;
