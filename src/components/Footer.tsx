import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation('common');

  return (
    <footer className="bg-muted/30 border-t border-border py-12">
      <div className="container mx-auto px-4">
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <Logo variant="horizontal" size="lg" />
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 max-w-4xl mx-auto">
          <div>
            <h3 className="font-semibold mb-3 text-foreground">{t('footer.platform')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.home')}</Link></li>
              <li><Link to="/doctors" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.findDoctors')}</Link></li>
              <li><Link to="/practices" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.practices')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-foreground">{t('footer.forProviders')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/doctor-signup" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.joinProvider')}</Link></li>
              <li><Link to="/register-practice" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.registerPractice')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-foreground">{t('footer.company')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.aboutUs')}</Link></li>
              <li><Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.legalCenter')}</Link></li>
              <li><a href="mailto:info@docito.com" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.contact')}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-foreground">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/legal/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.termsOfService')}</Link></li>
              <li><Link to="/legal/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.privacyPolicy')}</Link></li>
              <li><Link to="/legal/cookie-policy" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.cookiePolicy')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div className="border-t border-border pt-6 mb-6">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl mx-auto text-center">
            {t('footer.disclaimer')}
          </p>
        </div>

        {/* Copyright and Social */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-foreground font-medium mb-1">
              © {currentYear} <span className="font-bold text-primary">Docito®</span> - {t('footer.allRightsReserved')}
            </p>
            <p className="text-xs text-muted-foreground mb-1">
              {t('footer.trademark')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('footer.patent')}
            </p>
          </div>
          
          <div className="flex gap-4">
            <a href="#" className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;