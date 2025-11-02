import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import ThemeToggle from "./ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const ModernFooter = () => {
  const platformLinks = [
    { name: "Search Doctors", href: "/search-doctors" },
    { name: "Browse Specialties", href: "/browse-specialties" },
    { name: "Find Practices", href: "/find-practices" },
    { name: "Features", href: "/features" },
  ];

  const supportLinks = [
    { name: "Help Center", href: "/help-center" },
    { name: "Contact Us", href: "/contact" },
    { name: "FAQs", href: "/faqs" },
    { name: "Support", href: "/support" },
  ];

  const legalLinks = [
    { name: "About Us", href: "/about" },
    { name: "Privacy Policy", href: "/legal/privacy-policy" },
    { name: "Terms of Service", href: "/legal/terms-of-service" },
    { name: "Cookie Policy", href: "/legal/cookie-policy" },
    { name: "Legal Center", href: "/legal" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  const contactInfo = [
    { icon: Mail, label: "contact@docito.com" },
    { icon: Phone, label: "+1 (555) 123-4567" },
    { icon: MapPin, label: "San Francisco, CA" },
  ];

  return (
    <footer id="contact" className="bg-slate-900 dark:bg-gray-950 text-slate-300 dark:text-slate-300">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Logo variant="horizontal" size="md" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-md">
              Professional Medical Platform. Enterprise-grade healthcare management with secure booking, digital records, and comprehensive analytics for medical professionals.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-slate-800/50 dark:bg-gray-900/50 backdrop-blur-sm border border-slate-700 dark:border-gray-800 flex items-center justify-center hover:bg-slate-700 dark:hover:bg-gray-800 hover:scale-110 transition-all duration-300 text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-slate-100 dark:text-slate-100">Platform</h4>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-slate-100 dark:text-slate-100">Support</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-slate-100 dark:text-slate-100">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {contactInfo.map((info, index) => (
            <div
              key={index}
              className="bg-slate-800/50 dark:bg-gray-900/50 backdrop-blur-sm border border-slate-700 dark:border-gray-800 rounded-xl p-4 flex items-center space-x-3 hover:bg-slate-700 dark:hover:bg-gray-800 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <info.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-slate-300 dark:text-slate-300">{info.label}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="border-t border-slate-800 dark:border-gray-800 pt-8 mb-8">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-4xl">
            <strong className="text-slate-300 dark:text-slate-400">Medical Disclaimer:</strong> Content provided is for informational purposes only. Not intended as medical advice, diagnosis, or treatment. Always consult healthcare providers directly for medical advice. Platform facilitates connections between patients and providers but does not provide medical services directly. HIPAA Compliant.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-slate-400 dark:text-slate-500 text-center md:text-left">
            <div>© 2025 <span className="font-bold text-primary">Docito®</span> - All Rights Reserved</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Docito is a registered trademark and brand of <span className="font-semibold text-slate-300 dark:text-slate-400">Artsy Developers Inc.</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <Link to="/legal/terms-of-service" className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/legal/privacy-policy" className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/legal/cookie-policy" className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
              Cookies
            </Link>
            <Link to="/about" className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
              About
            </Link>
            <div className="ml-4 flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ModernFooter;
