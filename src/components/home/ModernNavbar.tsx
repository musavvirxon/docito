import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
const ModernNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const {
    t
  } = useTranslation('common');
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const navLinks = [{
    name: t('navigation.findDoctors'),
    href: "/search-doctors",
    isRoute: true
  }, {
    name: t('navigation.specialties'),
    href: "/browse-specialties",
    isRoute: true
  }, {
    name: t('navigation.practices'),
    href: "/find-practices",
    isRoute: true
  }, {
    name: t('navigation.features'),
    href: "/features",
    isRoute: true
  }, {
    name: t('navigation.pricing'),
    href: "/pricing",
    isRoute: true
  }, {
    name: t('navigation.about'),
    href: "/about",
    isRoute: true
  }];
  return <motion.nav initial={{
    y: -100
  }} animate={{
    y: 0
  }} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-xl shadow-lg border-b border-border dark:shadow-[0_4px_20px_rgba(59,130,246,0.1)]" : "bg-transparent"}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity duration-200" aria-label="Go to homepage">
            <Logo variant="horizontal" size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map(link => link.isRoute ? <Link key={link.name} to={link.href} className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 relative group">
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link> : <a key={link.name} href={link.href} className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 relative group">
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </a>)}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            <ThemeToggle />
            <LanguageSwitcher />
            {user ? <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-sm font-medium">
                  {t('navigation.dashboard')}
                </Button>
                <Button onClick={signOut} className="bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-105 transition-all duration-300">
                  {t('navigation.logout')}
                </Button>
              </> : <>
                <Button variant="ghost" onClick={() => navigate("/auth")} className="text-sm font-medium">
                  {t('navigation.login')}
                </Button>
                <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-105 transition-all duration-300">
                  {t('navigation.register')}
                </Button>
              </>}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors" aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={isMobileMenuOpen}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: "auto"
      }} exit={{
        opacity: 0,
        height: 0
      }} className="lg:hidden bg-background border-t border-border">
            <div className="container mx-auto px-4 py-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
              {navLinks.map(link => link.isRoute ? <Link key={link.name} to={link.href} onClick={() => setIsMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link> : <a key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary transition-colors">
                    {link.name}
                  </a>)}
              <div className="pt-4 space-y-3">
                {user ? <>
                    <Button variant="outline" onClick={() => {
                navigate("/dashboard");
                setIsMobileMenuOpen(false);
              }} className="w-full">
                      {t('navigation.dashboard')}
                    </Button>
                    <Button onClick={() => {
                signOut();
                setIsMobileMenuOpen(false);
              }} className="w-full bg-primary text-primary-foreground">
                      {t('navigation.logout')}
                    </Button>
                  </> : <>
                    <Button variant="outline" onClick={() => {
                navigate("/auth");
                setIsMobileMenuOpen(false);
              }} className="w-full">
                      {t('navigation.login')}
                    </Button>
                    <Button onClick={() => {
                navigate("/auth");
                setIsMobileMenuOpen(false);
              }} className="w-full bg-primary text-primary-foreground">
                      {t('navigation.scheduleDemo')}
                    </Button>
                  </>}
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>
    </motion.nav>;
};
export default ModernNavbar;