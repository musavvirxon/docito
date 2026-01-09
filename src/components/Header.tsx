import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Settings, Bell as BellIcon, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { getDashboardRoute, roleLabels, type AppRole } from "@/lib/rbac";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ✅ roles added
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
    { name: "Doctors", href: "/doctor" },
    { name: "Medical Practices", href: "/practice" },
    { name: "Pharmacies", href: "/pharmacy" },
    { name: "Laboratories", href: "/lab" },
    { name: "Imaging Centers", href: "/imaging-center" },
    { name: "Features", href: "/features" },
    { name: "About Us", href: "/about" },
  ];

  const isActive = (href: string) => location.pathname === href;

  const handleRoleClick = (role: AppRole) => {
    switchRole(role);
    navigate(getDashboardRoute([role]));
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
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center hover:opacity-70 transition-opacity duration-200"
            >
              <img
                src="/logos/horizontal/docito-horizontal-sm.png"
                alt="Docito"
                className="h-6"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center justify-center flex-1 mx-8">
              <div className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive(link.href)
                        ? "text-foreground"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Section */}
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
                      <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>

                      {/* ✅ Roles section */}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Your roles
                      </DropdownMenuLabel>

                      {(allRoles ?? []).map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => handleRoleClick(role)}
                          className="flex items-center justify-between"
                        >
                          <span>{roleLabels[role] ?? role}</span>
                          {role === activeRole ? <Check className="h-4 w-4 opacity-70" /> : null}
                        </DropdownMenuItem>
                      ))}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => navigate("/notifications")}>
                        <BellIcon className="mr-2 h-4 w-4" />
                        <span>Notifications</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => navigate("/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
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
                  Register
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex xl:hidden items-center gap-2">
              <ThemeToggle />
              {user && <NotificationDropdown />}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              className="xl:hidden bg-background/95 backdrop-blur-2xl border-t border-border/40 overflow-hidden"
            >
              <div className="max-w-[1200px] mx-auto px-6 py-6">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block py-3 text-base font-medium transition-colors ${
                          isActive(link.href)
                            ? "text-primary"
                            : "text-foreground/80 hover:text-foreground"
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
                          navigate("/dashboard");
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full h-12 text-base font-medium rounded-xl"
                      >
                        Dashboard
                      </Button>
                      <Button
                        onClick={() => {
                          signOut();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full h-12 text-base font-medium rounded-xl bg-primary text-primary-foreground"
                      >
                        Logout
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
                      Register
                    </Button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Spacer */}
      <div className="h-12" />
    </>
  );
};

export default Header;
