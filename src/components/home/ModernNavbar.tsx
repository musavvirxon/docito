import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ModernNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Specialties", href: "#specialties" },
    { name: "Doctors", href: "#doctors" },
    { name: "Features", href: "#features" },
    { name: "Analytics", href: "#analytics" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/80 backdrop-blur-xl shadow-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(243,75%,59%)] rounded-xl transform group-hover:scale-110 transition-transform duration-300"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">D</span>
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(243,75%,59%)] bg-clip-text text-transparent">
              Docito
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="text-sm font-medium"
                >
                  Dashboard
                </Button>
                <Button
                  onClick={signOut}
                  className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(243,75%,59%)] text-primary-foreground hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className="text-sm font-medium"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(243,75%,59%)] text-primary-foreground hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background border-t border-border"
          >
            <div className="container mx-auto px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-medium text-foreground hover:text-primary transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 space-y-3">
                {user ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate("/dashboard");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Dashboard
                    </Button>
                    <Button
                      onClick={() => {
                        signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(243,75%,59%)] text-primary-foreground"
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate("/auth");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => {
                        navigate("/auth");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(243,75%,59%)] text-primary-foreground"
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default ModernNavbar;
