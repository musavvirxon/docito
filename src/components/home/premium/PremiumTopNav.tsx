// src/components/home/premium/PremiumTopNav.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";

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
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("premium");
  const { getLocalizedPath } = useLocalizedPath();

  const { user } = useAuth();

  useEffect(() => {
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
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-background/80 backdrop-blur-2xl border-b border-border/40 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link
              to={getLocalizedPath("/")}
              className="flex items-center hover:opacity-70 transition-opacity duration-200 flex-shrink-0"
            >
              <img
                src="/logos/horizontal/docito-horizontal-sm.png"
                alt="Docito"
                className="h-6"
                width={80}
                height={24}
                fetchPriority="high"
              />
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

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden bg-background/95 backdrop-blur-2xl border-t border-border/40 overflow-hidden"
            >
              <div className="max-w-[1400px] mx-auto px-4 py-6">
                <div className="grid grid-cols-2 gap-2">
                  {navLinks.map((link, index) => {
                    const href = getLocalizedPath(link.href);
                    return (
                      <motion.div
                        key={link.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Link
                          to={href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-3 px-4 text-sm font-medium rounded-xl transition-colors ${
                            isActive(href)
                              ? "text-primary bg-primary/10"
                              : "text-foreground/80 hover:text-foreground hover:bg-accent/50"
                          }`}
                        >
                          {labelFor(link.key)}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {!user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6 pt-6 border-t border-border/40 flex gap-3"
                  >
                    <Button
                      onClick={() => {
                        navigate(getLocalizedPath("/auth"));
                        setIsMobileMenuOpen(false);
                      }}
                      variant="outline"
                      className="flex-1 h-12 text-sm font-medium rounded-xl"
                    >
                      {t("topNav.actions.signIn", { defaultValue: "Sign In" })}
                    </Button>
                    <Button
                      onClick={() => {
                        navigate(getLocalizedPath("/auth?mode=register"));
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex-1 h-12 text-sm font-medium rounded-xl bg-primary text-primary-foreground"
                    >
                      {t("topNav.actions.register", { defaultValue: "Register" })}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer to prevent content from hiding under fixed nav */}
      <div className="h-14" />
    </>
  );
};

export default PremiumTopNav;
