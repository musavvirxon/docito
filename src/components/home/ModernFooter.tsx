import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const ModernFooter = () => {
  const platformLinks = [
    { name: "Search Doctors", href: "/find-doctors" },
    { name: "Browse Specialties", href: "/specialties" },
    { name: "Find Practices", href: "/practices" },
    { name: "Features", href: "#features" },
  ];

  const supportLinks = [
    { name: "Help Center", href: "/help" },
    { name: "Contact Us", href: "/contact" },
    { name: "FAQs", href: "/faqs" },
    { name: "Support", href: "/support" },
  ];

  const legalLinks = [
    { name: "About Us", href: "/about" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
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
    <footer id="contact" className="bg-slate-900 dark:bg-gray-950 text-foreground dark:text-slate-300">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(243,75%,59%)] rounded-xl flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">D</span>
              </div>
              <span className="text-2xl font-bold">Docito</span>
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
            <h4 className="font-semibold text-lg mb-4">Platform</h4>
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
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
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
              <span className="text-sm">{info.label}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="border-t border-slate-800 dark:border-gray-800 pt-8 mb-8">
          <p className="text-xs text-slate-500 dark:text-slate-600 leading-relaxed max-w-4xl">
            <strong>Medical Disclaimer:</strong> Content provided is for informational purposes only. Not intended as medical advice, diagnosis, or treatment. Always consult healthcare providers directly for medical advice. Platform facilitates connections between patients and providers but does not provide medical services directly. HIPAA Compliant.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-slate-500 dark:text-slate-600">
            © 2025 Docito. All rights reserved. HIPAA Compliant.
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/terms" className="text-xs text-slate-500 dark:text-slate-600 hover:text-primary dark:hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-xs text-slate-500 dark:text-slate-600 hover:text-primary dark:hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/cookies" className="text-xs text-slate-500 dark:text-slate-600 hover:text-primary dark:hover:text-primary transition-colors">
              Cookies
            </Link>
            <Link to="/sitemap" className="text-xs text-slate-500 dark:text-slate-600 hover:text-primary dark:hover:text-primary transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ModernFooter;
