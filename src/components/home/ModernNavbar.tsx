import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import ProfileMenu from "@/components/dashboard/ProfileMenu";

const ModernNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ must be here (top-level), NOT inside JSX
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Doctors", href: "/for-doctors" },
    { name: "Clinics", href: "/for-practices" },
    { name: "Labs", href: "/for-labs" },
    { name: "Pharmacies", href: "/for-pharmacies" },
    { name: "Imaging", href: "/for-imaging" },
    { name: "Hospitals", href: "/for-hospitals" },
    { name: "Pricing", href: "/pricing" },
    { name: "How It Works", href: "/how-it-works" },
  ];

  const isActive = (href: string) => location.pathname === href;

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
              to="/"
              className="flex items-center hover:opacity-70 transition-opacity duration-200 flex-shrink-0"
            >
              <img
                src="/logos/horizontal/docito-horizontal-sm.png"
                alt="Docito"
                className="h-6"
              />
            </Link>

            {/* Desktop Navigation - Center */}
            <div className="hidden lg:flex items-center justify-center flex-1 mx-4">
              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                      isActive(link.href)
                        ? "text-primary bg-primary/10"
                        : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Section (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              {user ? (
                <ProfileMenu />
              ) : (
                <>
                  <Button
                    onClick={() => navigate("/auth")}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-4 text-xs font-medium"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate("/auth?mode=register")}
                    size="sm"
                    className="h-8 px-4 text-xs font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Join as Provider
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              {user ? <ProfileMenu /> : null}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
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
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link
                        to={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block py-3 px-4 text-sm font-medium rounded-xl transition-colors ${
                          isActive(link.href)
                            ? "text-primary bg-primary/10"
                            : "text-foreground/80 hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Mobile Auth Buttons */}
                {!user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6 pt-6 border-t border-border/40 flex gap-3"
                  >
                    <Button
                      onClick={() => {
                        navigate("/auth");
                        setIsMobileMenuOpen(false);
                      }}
                      variant="outline"
                      className="flex-1 h-12 text-sm font-medium rounded-xl"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => {
                        navigate("/auth?mode=register");
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex-1 h-12 text-sm font-medium rounded-xl bg-primary text-primary-foreground"
                    >
                      Join as Provider
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
};

export default ModernNavbar;

