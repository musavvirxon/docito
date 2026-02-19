// src/components/home/premium/PremiumFooter.tsx
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Mail, Phone, MapPin, Globe } from "lucide-react";
import { Logo } from "@/components/Logo";
import ThemeToggle from "@/components/home/ThemeToggle";
import { languages as allLanguages } from "@/i18n/config";

const footerLinks = {
  platform: [
    { key: "about", href: "/about" },
    { key: "features", href: "/features" },
    { key: "findDoctors", href: "/find-doctors" },
    { key: "searchDoctors", href: "/search-doctors" },
    { key: "specialties", href: "/specialties" },
    { key: "howItWorks", href: "/how-it-works" },
  ],
  support: [
    { key: "helpCenter", href: "/help" },
    { key: "contact", href: "/contact" },
    { key: "faqs", href: "/faqs" },
    { key: "support", href: "/support" },
  ],
  legal: [
    { key: "terms", href: "/legal/terms-of-service" },
    { key: "privacy", href: "/legal/privacy-policy" },
    { key: "cookies", href: "/legal/cookies" },
    { key: "hipaa", href: "/legal/hipaa" },
  ],
} as const;

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com/docito", label: "Twitter" },
  { icon: Facebook, href: "https://facebook.com/docito", label: "Facebook" },
  { icon: Instagram, href: "https://instagram.com/docito", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com/company/docito", label: "LinkedIn" },
  { icon: Youtube, href: "https://youtube.com/docito", label: "YouTube" },
] as const;

const fallbackLabels: Record<string, string> = {
  // Platform
  about: "About",
  features: "Features",
  findDoctors: "Find doctors",
  searchDoctors: "Search doctors",
  specialties: "Specialties",
  howItWorks: "How it works",

  // Support
  helpCenter: "Help Center",
  contact: "Contact",
  faqs: "FAQs",
  support: "Support",

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

function asString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

function languageLabel(code: string) {
  switch (code) {
    case "en":
      return "en — English 🇬🇧";
    case "ru":
      return "ru — Русский 🇷🇺";
    case "de":
      return "de — Deutsch 🇩🇪";
    case "es":
      return "es — Español 🇪🇸";
    case "zh":
      return "zh — 中文 🇨🇳";
    case "pt":
      return "pt — Português 🇧🇷";
    case "ja":
      return "ja — 日本語 🇯🇵";
    case "ko":
      return "ko — 한국어 🇰🇷";
    case "ar":
      return "ar — العربية 🇸🇦";
    case "tr":
      return "tr — Türkçe 🇹🇷";
    case "uz":
      return "uz — O'zbek 🇺🇿";
    default:
      return code;
  }
}

export default function PremiumFooter() {
  const { t, i18n } = useTranslation(["home", "common"]);
  const { lang } = useParams<{ lang?: string }>();
  const currentYear = new Date().getFullYear();

  const supportedLangCodes = new Set(allLanguages.map((l) => l.code));
  const langPrefix = lang && supportedLangCodes.has(lang) ? `/${lang}` : "";

  const normalize = (href: string) => (href.startsWith("/") ? href : `/${href}`);
  const withLang = (href: string) => (langPrefix ? `${langPrefix}${normalize(href)}` : normalize(href));
  const homeHref = langPrefix || "/";

  const platformTitle = asString(t("home:footer.platform.title", { defaultValue: "Platform" }), "Platform");
  const supportTitle = asString(t("home:footer.support.title", { defaultValue: "Support" }), "Support");
  const legalTitle = asString(t("home:footer.legal.title", { defaultValue: "Legal" }), "Legal");
  const contactTitle = asString(t("home:footer.contactTitle", { defaultValue: "Contact" }), "Contact");

  return (
    <footer className="relative bg-muted/30 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
          <div className="col-span-2">
            <Link to={homeHref} className="inline-block mb-6">
              <Logo className="h-8 w-auto" />
            </Link>

            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {asString(
                t("home:footer.description", {
                  defaultValue: "The Complete Healthcare Operating System For Modern Medical Practices.",
                }),
                "The Complete Healthcare Operating System For Modern Medical Practices.",
              )}
            </p>

            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-4" role="heading" aria-level={2}>
              {platformTitle}
            </p>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => {
                const fb = fallbackFor(link.key);
                const label = asString(t(`home:footer.links.${link.key}`, { defaultValue: fb }), fb);
                return (
                  <li key={link.key}>
                    <Link
                      to={withLang(link.href)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-4" role="heading" aria-level={2}>
              {supportTitle}
            </p>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => {
                const fb = fallbackFor(link.key);
                const label = asString(t(`home:footer.links.${link.key}`, { defaultValue: fb }), fb);
                return (
                  <li key={link.key}>
                    <Link
                      to={withLang(link.href)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-4" role="heading" aria-level={2}>
              {legalTitle}
            </p>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => {
                const fb = fallbackFor(link.key);
                const label = asString(t(`home:footer.links.${link.key}`, { defaultValue: fb }), fb);
                return (
                  <li key={link.key}>
                    <Link
                      to={withLang(link.href)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-4" role="heading" aria-level={2}>
              {contactTitle}
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

      <div className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {currentYear} Docito®.{" "}
              {asString(t("home:footer.rights", { defaultValue: "All Rights Reserved." }), "All Rights Reserved.")}
            </p>

            <div className="flex items-center gap-4">
              <ThemeToggle />

              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <select
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  aria-label={asString(
                    t("common:language.select", { defaultValue: "Select Language" }),
                    "Select Language",
                  )}
                  className="bg-background text-sm text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none border border-border/50 rounded-lg px-2 py-1"
                >
                  {allLanguages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {languageLabel(l.code)}
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
