import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import ThemeToggle from "./ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";

const ModernFooter = () => {
  const { getLocalizedPath } = useLocalizedPath();

  const platformLinks = [
    { name: "Doctors", href: "for-doctors" },
    { name: "Clinics", href: "for-practices" },
    { name: "Labs", href: "for-labs" },
    { name: "Pharmacies", href: "for-pharmacies" },
    { name: "Imaging", href: "for-imaging" },
    { name: "Hospitals", href: "for-hospitals" },
    { name: "Pricing", href: "pricing" },
    { name: "How It Works", href: "how-it-works" },
  ];

  const companyLinks = [
    { name: "About Docito", href: "about" },
    { name: "Careers", href: "careers" },
    { name: "Blog", href: "blog" },
    { name: "Press", href: "press" },
  ];

  const supportLinks = [
    { name: "Help Center", href: "help-center" },
    { name: "Contact Support", href: "contact" },
    { name: "FAQs", href: "faqs" },
    { name: "Insurance Help", href: "insurance-help" },
  ];

  const legalLinks = [
    { name: "Privacy Policy", href: "legal/privacy-policy" },
    { name: "Terms of Service", href: "legal/terms-of-service" },
    { name: "HIPAA", href: "legal/hipaa" },
    { name: "Cookies", href: "legal/cookie-policy" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="bg-slate-900 dark:bg-gray-950 text-slate-300">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="mb-4">
              <Logo variant="horizontal" size="md" />
            </div>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              The unified healthcare platform connecting patients with verified providers worldwide.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center hover:bg-slate-700 hover:scale-110 transition-all duration-300 text-slate-400 hover:text-primary"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-slate-100">Platform</h3>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={getLocalizedPath(link.href)}
                    className="text-sm text-slate-400 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-slate-100">Company</h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={getLocalizedPath(link.href)}
                    className="text-sm text-slate-400 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-slate-100">Support</h3>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={getLocalizedPath(link.href)}
                    className="text-sm text-slate-400 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-slate-100">Legal</h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={getLocalizedPath(link.href)}
                    className="text-sm text-slate-400 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-slate-400">
            © 2025 <span className="font-semibold text-primary">Docito®</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ModernFooter;