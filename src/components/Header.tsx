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
import { getDashboardRoute, type AppRole } from "@/lib/rbac";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, signOut, allRoles, activeRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleToLabel = (role: AppRole) =>
    role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" : "bg-background"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
            <span className="text-xl font-bold">Docito</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/doctor"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/doctor") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Doctors
          </Link>
          <Link
            to="/practice"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/practice") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Practices
          </Link>
          <Link
            to="/pricing"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/pricing") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Pricing
          </Link>
          <Link
            to="/how-it-works"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/how-it-works") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            How it works
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
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
                  {/* Main dashboard entry (universal) */}
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>

                  {/* Roles list */}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Your roles
                  </DropdownMenuLabel>

                  {allRoles.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => {
                        switchRole(role);
                        navigate(getDashboardRoute([role]));
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>{roleToLabel(role)}</span>
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
            <Button onClick={() => navigate("/auth")} className="hidden md:inline-flex">
              Sign In
            </Button>
          )}

          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t bg-background"
          >
            <div className="container py-4 flex flex-col gap-4">
              <Link
                to="/doctor"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/doctor") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={closeMobileMenu}
              >
                Doctors
              </Link>
              <Link
                to="/practice"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/practice") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={closeMobileMenu}
              >
                Practices
              </Link>
              <Link
                to="/pricing"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/pricing") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={closeMobileMenu}
              >
                Pricing
              </Link>
              <Link
                to="/how-it-works"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/how-it-works") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={closeMobileMenu}
              >
                How it works
              </Link>

              {!user && (
                <Button
                  onClick={() => {
                    closeMobileMenu();
                    navigate("/auth");
                  }}
                >
                  Sign In
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
