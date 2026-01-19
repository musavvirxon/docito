import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import {
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Globe,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import ThemeToggle from "@/components/home/ThemeToggle";

const footerLinks = {
  platform: [
    { key: "about", href: "/about" },
    { key: "features", href: "/features" },
    { key: "findDoctors", href: "/find-doctors" },
    { key: "specialties", href: "/specialties" },
    { key: "howItWorks", href: "/how-it-works" },
  ],
  support: [
    { key: "helpCenter", href: "/help" },
    { key: "contact", href: "/contact" },
    { key: "faq", href: "/faqs" },
    { key: "documentation", href: "/docs" },
  ],
  legal: [
    { key: "terms", href: "/terms" },
    { key: "privacy", href: "/privacy" },
    { key: "cookies", href: "/cookies" },
    { key: "hipaa", href: "/hipaa" },
  ],
} as const;

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com/docito", label: "Twitter" },
  { icon: Facebook, href: "https://facebook.com/docito", label: "Facebook" },
  { icon: Instagram, href: "https://instagram.com/docito", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com/company/docito", label: "LinkedIn" },
  { icon: Youtube, href: "https://youtube.com/docito", label: "YouTube" },
] as const;

/**
 * Language selector options (exact set requested).
 * - We also toggle HTML dir for RTL on Arabic.
 */
const languages = [
  { code: "en", name: "English", flag: "🇬🇧" }, // LTR
  { code: "ru", name: "Русский", flag: "🇷🇺" }, // LTR
  { code: "uz", name: "O'zbek", flag: "🇺🇿" }, // LTR
  { code: "ar", name: "العربية", flag: "🇸🇦" }, // RTL
  { code: "tr", name: "Türkçe", flag: "🇹🇷" }, // LTR
  { code: "es", name: "Español", flag: "🇪🇸" }, // LTR
  { code: "de", name: "Deutsch", flag: "🇩🇪" }, // LTR
  { code: "zh", name: "中文", flag: "🇨🇳" }, // LTR
  { code: "pt", name: "Português", flag: "🇧🇷" }, // LTR
  { code: "ja", name: "日本語", flag: "🇯🇵" }, // LTR
  { code: "ko", name: "한국어", flag: "🇰🇷" }, // LTR
] as const;

const RTL_LANGS = new Set<string>(["ar"]);

const fallbackLabels: Record<string, string> = {
  // Platform
  about: "About",
  features: "Features",
  findDoctors: "Find Doctors",
  specialties: "Specialties",
  howItWorks: "How It Works",

  // Support
  helpCenter: "Help Center",
  contact: "Contact",
  faq: "FAQs",
  documentation: "Documentation",

  // Legal
  terms: "Terms",
  privacy: "Privacy",
  cookies: "Cookies",
  hipaa: "HIPAA",
};

function titleizeKey(key: string) {
  const withSpaces = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

  if (!withSpaces) return key;

  return withSpaces
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function fallbackFor(key: string) {
  return fallbackLabels[key] || titleizeKey(key);
}

export default function PremiumFooter() {
  const { t, i18n } = useTranslation(["home", "common"]);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const lang = i18n.language || "en";
    const base = lang.split("-")[0]; // normalize (e.g., ar-SA -> ar)
    const isRtl = RTL_LANGS.has(base);

    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = base;
  }, [i18n.language]);

  return (
    <footer className="relative bg-muted/30 border-t border-border/50">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="inline-block mb-6">
              <Logo className="h-8 w-auto" />
            </Link>

            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {t(
                "home:footer.description",
                "The Complete Healthcare Operating System For Modern Medical Practices."
              )}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4" role="heading" aria-level={2}>
              {t("home:footer.platform.title", "Platform")}
            </p>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`home:footer.links.${link.key}`, fallbackFor(link.key))}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4" role="heading" aria-level={2}>
              {t("home:footer.support.title", "Support")}
            </p>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`home:footer.links.${link.key}`, fallbackFor(link.key))}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4" role="heading" aria-level={2}>
              {t("home:footer.legal.title", "Legal")}
            </p>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`home:footer.links.${link.key}`, fallbackFor(link.key))}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4" role="heading" aria-level={2}>
              {t("home:footer.contactTitle", "Contact")}
            </p>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:support@docito.com"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  support@docito.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+1234567890"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  +1 (234) 567-890
                </a>
              </li>
              <li>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  Global
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {currentYear} Docito®. {t("home:footer.rights", "All Rights Reserved.")}
            </p>

            <div className="flex items-center gap-4">
              <ThemeToggle />

              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <select
                  value={(i18n.language || "en").split("-")[0]}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  aria-label={t("common:language.select", "Select Language")}
                  className="bg-background text-sm text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none border border-border/50 rounded-lg px-2 py-1"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} {lang.flag}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
