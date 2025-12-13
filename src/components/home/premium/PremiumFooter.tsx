import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube,
  Mail,
  Phone,
  MapPin,
  Globe
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import ThemeToggle from '@/components/home/ThemeToggle';

const footerLinks = {
  platform: [
    { key: 'doctors', href: '/search?type=doctors' },
    { key: 'clinics', href: '/search?type=clinics' },
    { key: 'labs', href: '/search?type=labs' },
    { key: 'pharmacies', href: '/search?type=pharmacies' },
    { key: 'imaging', href: '/search?type=imaging' },
    { key: 'hospitals', href: '/search?type=hospitals' },
  ],
  support: [
    { key: 'helpCenter', href: '/help' },
    { key: 'contact', href: '/contact' },
    { key: 'faq', href: '/faq' },
    { key: 'documentation', href: '/docs' },
  ],
  legal: [
    { key: 'terms', href: '/terms' },
    { key: 'privacy', href: '/privacy' },
    { key: 'cookies', href: '/cookies' },
    { key: 'hipaa', href: '/hipaa' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/docito', label: 'Twitter' },
  { icon: Facebook, href: 'https://facebook.com/docito', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/docito', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/docito', label: 'LinkedIn' },
  { icon: Youtube, href: 'https://youtube.com/docito', label: 'YouTube' },
];

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function PremiumFooter() {
  const { t, i18n } = useTranslation(['home', 'common']);
  const currentYear = new Date().getFullYear();

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
              {t('home:footer.description', 'The complete healthcare operating system for modern medical practices.')}
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
            <h4 className="text-sm font-semibold text-foreground mb-4">
              {t('home:footer.platform', 'Platform')}
            </h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`home:footer.links.${link.key}`, link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              {t('home:footer.support', 'Support')}
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`home:footer.links.${link.key}`, link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              {t('home:footer.legal', 'Legal')}
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(`home:footer.links.${link.key}`, link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              {t('home:footer.contact', 'Contact')}
            </h4>
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
            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {currentYear} Docito®. {t('home:footer.rights', 'All rights reserved.')}
            </p>

            {/* Theme Toggle & Language Selector */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <select
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  className="bg-background text-sm text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none border border-border/50 rounded-lg px-2 py-1"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
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
