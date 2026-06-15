// File: src/components/Header.tsx
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Settings, Bell as BellIcon, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import ThemeToggle from "@/components/home/ThemeToggle";
import {
  DASHBOARD_ROUTES,
  getDashboardRoute,
  getUserRolesFromProfile,
  roleLabels,
  type AppRole,
} from "@/lib/rbac";

const Header = () => {
  const { t } = useTranslation("common");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, profile, signOut, allRoles, activeRole, switchRole } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: t("header.nav.doctors"), href: "/doctor" },
    { name: t("header.nav.practices"), href: "/practice" },
    { name: t("header.nav.pharmacies"), href: "/pharmacy" },
    { name: t("header.nav.labs"), href: "/lab" },
    { name: t("header.nav.imaging"), href: "/imaging-center" },
    { name: t("header.nav.features"), href: "/features" },
    { name: t("header.nav.about"), href: "/about" },
  ];

  const isActive = (href: string) => location.pathname === href;

  const roles: AppRole[] = useMemo(() => {
    if (!user) return [];
    const fromContext = Array.isArray(allRoles) ? allRoles : [];
    const fallback = getUserRolesFromProfile(profile);
    const merged = fromContext.length > 0 ? fromContext : fallback;
    return Array.from(new Set((merged || []).filter(Boolean) as AppRole[]));
  }, [allRoles, profile, user]);

  const canSwitchRoles = roles.length > 1;

  const effectiveActiveRole: AppRole = useMemo(() => {
    if (roles.length === 0) return activeRole;
    return roles.includes(activeRole) ? activeRole : roles[0];
  }, [activeRole, roles]);

  const dashboardRoute = useMemo(() => {
    if (roles.length > 0) return getDashboardRoute([effectiveActiveRole]);
    return "/dashboard";
  }, [effectiveActiveRole, roles.length]);

  const dashboardLabel = useMemo(() => {
    if (roles.length === 1) {
      return t("header.dashboardWithRole", { role: roleLabels[roles[0]] || roles[0] });
    }
    return t("header.dashboard");
  }, [roles, t]);

  const handleRoleClick = (role: AppRole) => {
    switchRole(role);
    navigate(DASHBOARD_ROUTES[role] ?? getDashboardRoute([role]));
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-background/70 backdrop-blur-2xl border-b border-border/40 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between h-12">
            <Link to="/" className="flex items-center hover:opacity-70 transition-opacity duration-200">
              <img 
                src="/logos/horizontal/docito-horizontal-sm.png" 
                alt={t("header.logoAlt")}
                className="h-6"
                width={80}
                height={24}
                fetchPriority="high"
              />
            </Link>

            <div className="hidden xl:flex items-center justify-center flex-1 mx-8">
              <div className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive(link.href) ? "text-foreground" : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-3">
              <ThemeToggle />
              {user ? (
                <>
                  <NotificationDropdown />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                          <AvatarFallback className="text-xs">
                            {profile?.full_name?.split(" ").map((n) => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-56" align="end">
                      <DropdownMenuItem onClick={() => navigate(dashboardRoute)}>
                        <User className="mr-2 h-4 w-4" />
                        <span>{dashboardLabel}</span>
                      </DropdownMenuItem>

                      {canSwitchRoles ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">{t("header.yourRoles")}</DropdownMenuLabel>

                          {roles.map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => handleRoleClick(role)}
                              className="flex items-center justify-between"
                            >
                              <span>{roleLabels[role] ?? role}</span>
                              {role === effectiveActiveRole ? <Check className="h-4 w-4 opacity-70" /> : null}
                            </DropdownMenuItem>
                          ))}
                        </>
                      ) : null}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => navigate("/notifications")}>
                        <BellIcon className="mr-2 h-4 w-4" />
                        <span>{t("header.notifications")}</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => navigate("/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{t("header.settings")}</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => { signOut(); navigate("/"); }}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{t("header.logout")}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button
                  onClick={() => navigate("/auth")}
                  size="sm"
                  className="h-8 px-4 text-xs font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                >
                  {t("header.register")}
                </Button>
              )}
            </div>

            <div className="flex xl:hidden items-center gap-2">
              <ThemeToggle />
              {user && <NotificationDropdown />}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label={isMobileMenuOpen ? t("header.menu.close") : t("header.menu.open")}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="xl:hidden bg-background/95 backdrop-blur-2xl border-t border-border/40 overflow-hidden"
            >
              <div className="max-w-[1200px] mx-auto px-6 py-6">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block py-3 text-base font-medium transition-colors ${
                          isActive(link.href) ? "text-primary" : "text-foreground/80 hover:text-foreground"
                        }`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 pt-6 border-t border-border/40"
                >
                  {user ? (
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigate(dashboardRoute);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full h-12 text-base font-medium rounded-xl"
                      >
                        {dashboardLabel}
                      </Button>

                      {canSwitchRoles ? (
                        <div className="rounded-xl border border-border/50 overflow-hidden">
                          <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/40">{t("header.switchRole")}</div>
                          <div className="flex flex-col">
                            {roles.map((role) => (
                              <button
                                key={role}
                                onClick={() => {
                                  handleRoleClick(role);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent/50 transition-colors ${
                                  role === effectiveActiveRole ? "bg-accent/40" : ""
                                }`}
                              >
                                <span>{roleLabels[role] ?? role}</span>
                                {role === effectiveActiveRole ? <Check className="h-4 w-4 opacity-70" /> : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <Button
                        onClick={() => {
                          signOut();
                          setIsMobileMenuOpen(false);
                          navigate("/");
                        }}
                        className="w-full h-12 text-base font-medium rounded-xl bg-primary text-primary-foreground"
                      >
                        {t("header.logout")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        navigate("/auth");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full h-12 text-base font-medium rounded-xl bg-primary text-primary-foreground"
                    >
                      {t("header.register")}
                    </Button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="h-12" />
    </>
  );
};

export default Header;
