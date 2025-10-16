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
    <footer id="contact" className="bg-gradient-to-br from-[hsl(221,83%,15%)] via-[hsl(243,75%,20%)] to-[hsl(271,76%,15%)] text-primary-foreground">
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
            <p className="text-sm text-primary-foreground/70 mb-6 max-w-md">
              The First All-in-One Medical & Dental Platform. Revolutionizing healthcare with seamless appointment booking, secure medical records, and comprehensive practice management.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all duration-300"
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
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
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
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center space-x-3 hover:bg-white/10 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center">
                <info.icon className="w-5 h-5" />
              </div>
              <span className="text-sm">{info.label}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/10 pt-8 mb-8">
          <p className="text-xs text-primary-foreground/60 leading-relaxed max-w-4xl">
            <strong>Medical Disclaimer:</strong> The content provided here and elsewhere on the Docito platform is for general informational purposes only. It is not intended as medical advice, diagnosis, or treatment. Always contact your healthcare provider directly with any questions you may have regarding your health or specific medical advice. The platform facilitates connections between patients and healthcare providers but does not provide medical services directly.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-primary-foreground/60">
            © 2025 Docito, Inc. All rights reserved. Made with ❤️ for better healthcare.
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/terms" className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/cookies" className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
              Cookies
            </Link>
            <Link to="/sitemap" className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ModernFooter;
