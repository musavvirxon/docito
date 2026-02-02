import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react";

export default function ModernFooter() {
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();

  const platformLinks = [
    { label: t("footer.doctors", "Doctors"), href: "/find-doctors" },
    { label: t("footer.clinics", "Clinics"), href: "/practices" },
    { label: t("footer.labs", "Labs"), href: "/labs" },
    { label: t("footer.pharmacies", "Pharmacies"), href: "/pharmacy" },
    { label: t("footer.imaging", "Imaging"), href: "/imaging" },
    { label: t("footer.pricing", "Pricing"), href: "/pricing" },
    { label: t("footer.howItWorks", "How It Works"), href: "/how-it-works" },
  ];

  const companyLinks = [
    { label: t("footer.about", "About"), href: "/about" },
    { label: t("footer.features", "Features"), href: "/features" },
    { label: t("footer.contact", "Contact"), href: "/contact" },
    { label: t("footer.feedback", "Feedback"), href: "/feedback" },
  ];

  const supportLinks = [
    { label: t("footer.helpCenter", "Help Center"), href: "/help-center" },
    { label: t("footer.support", "Support"), href: "/support" },
    { label: t("footer.faqs", "FAQs"), href: "/faqs" },
  ];

  const legalLinks = [
    { label: t("footer.privacy", "Privacy Policy"), href: "/legal/privacy-policy" },
    { label: t("footer.terms", "Terms of Service"), href: "/legal/terms-of-service" },
    { label: t("footer.cookies", "Cookie Policy"), href: "/cookie-policy" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ];

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <Logo className="h-8" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              {t("footer.tagline", "Connecting patients with trusted healthcare providers for a healthier tomorrow.")}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="p-2 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Column */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t("footer.platform", "Platform")}
            </h3>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t("footer.company", "Company")}
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t("footer.support", "Support")}
            </h3>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t("footer.legal", "Legal")}
            </h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Docito. {t("footer.allRightsReserved", "All rights reserved.")}
            </p>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
