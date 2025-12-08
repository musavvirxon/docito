import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import ThemeToggle from "./ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";
const ModernFooter = () => {
  const {
    t
  } = useTranslation("home");
  const {
    getLocalizedPath
  } = useLocalizedPath();
  const platformLinks = [{
    name: t("footer.platform.searchDoctors"),
    href: "search-doctors"
  }, {
    name: t("footer.platform.browseSpecialties"),
    href: "browse-specialties"
  }, {
    name: t("footer.platform.findPractices"),
    href: "find-practices"
  }, {
    name: t("footer.platform.features"),
    href: "features"
  }];
  const supportLinks = [{
    name: t("footer.support.helpCenter"),
    href: "help-center"
  }, {
    name: t("footer.support.contact"),
    href: "contact"
  }, {
    name: t("footer.support.faqs"),
    href: "faqs"
  }, {
    name: t("footer.support.support"),
    href: "support"
  }];
  const legalLinks = [{
    name: t("footer.legal.about"),
    href: "about"
  }, {
    name: t("footer.legal.privacy"),
    href: "legal/privacy-policy"
  }, {
    name: t("footer.legal.terms"),
    href: "legal/terms-of-service"
  }, {
    name: t("footer.legal.cookies"),
    href: "legal/cookie-policy"
  }, {
    name: t("footer.legal.legalCenter"),
    href: "legal"
  }];
  const socialLinks = [{
    icon: Facebook,
    href: "#",
    label: "Facebook"
  }, {
    icon: Twitter,
    href: "#",
    label: "Twitter"
  }, {
    icon: Instagram,
    href: "#",
    label: "Instagram"
  }, {
    icon: Linkedin,
    href: "#",
    label: "LinkedIn"
  }];
  const contactInfo = [{
    icon: Mail,
    label: t("footer.contact.email")
  }, {
    icon: Phone,
    label: t("footer.contact.phone")
  }, {
    icon: MapPin,
    label: t("footer.contact.location")
  }];
  return <footer id="contact" className="bg-slate-900 dark:bg-gray-950 text-slate-300 dark:text-slate-300">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Logo variant="horizontal" size="md" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-md">
              {t("footer.description")}
            </p>
            <div className="flex space-x-4">
              {socialLinks.map(social => <a key={social.label} href={social.href} aria-label={social.label} className="w-10 h-10 rounded-full bg-slate-800/50 dark:bg-gray-900/50 backdrop-blur-sm border border-slate-700 dark:border-gray-800 flex items-center justify-center hover:bg-slate-700 dark:hover:bg-gray-800 hover:scale-110 transition-all duration-300 text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary">
                  <social.icon className="w-5 h-5" />
                </a>)}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-slate-100 dark:text-slate-100">{t("footer.platform.title")}</h3>
            <ul className="space-y-3">
              {platformLinks.map(link => <li key={link.name}>
                  <Link to={getLocalizedPath(link.href)} className="text-sm text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-slate-100 dark:text-slate-100">{t("footer.support.title")}</h3>
            <ul className="space-y-3">
              {supportLinks.map(link => <li key={link.name}>
                  <Link to={getLocalizedPath(link.href)} className="text-sm text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-slate-100 dark:text-slate-100">{t("footer.legal.title")}</h3>
            <ul className="space-y-3">
              {legalLinks.map(link => <li key={link.name}>
                  <Link to={getLocalizedPath(link.href)} className="text-sm text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>)}
            </ul>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {contactInfo.map((info, index) => <div key={index} className="bg-slate-800/50 dark:bg-gray-900/50 backdrop-blur-sm border border-slate-700 dark:border-gray-800 rounded-xl p-4 flex items-center space-x-3 hover:bg-slate-700 dark:hover:bg-gray-800 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <info.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-slate-300 dark:text-slate-300">{info.label}</span>
            </div>)}
        </div>

        {/* Disclaimer */}
        <div className="border-t border-slate-800 dark:border-gray-800 pt-8 mb-8">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-4xl">
            {t("footer.disclaimer")}
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-slate-400 dark:text-slate-500 text-center md:text-left">
            <div>© 2025 <span className="font-bold text-primary">Docito®</span> - {t("footer.copyright")}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {t("footer.trademark")} <span className="font-semibold text-slate-300 dark:text-slate-400">{t("footer.company")}</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <Link to={getLocalizedPath("legal/terms-of-service")} className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
              {t("footer.links.terms")}
            </Link>
            <Link to={getLocalizedPath("legal/privacy-policy")} className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
              {t("footer.links.privacy")}
            </Link>
            <Link to={getLocalizedPath("legal/cookie-policy")} className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
              {t("footer.links.cookies")}
            </Link>
            <Link to={getLocalizedPath("about")} className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
              {t("footer.links.about")}
            </Link>
            <div className="ml-4 flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle className="text-[sidebar-accent-foreground] text-stone-950" />
            </div>
          </div>
        </div>
      </div>
    </footer>;
};
export default ModernFooter;