// src/components/Footer.tsx
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // ✅ Footer strings are in home.json (namespace "home"), not "common"
  const { t } = useTranslation("home");

  return (
    <footer className="bg-muted/30 border-t border-border py-12">
      <div className="container mx-auto px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo variant="horizontal" size="lg" />
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 max-w-5xl mx-auto">
          {/* Platform */}
          <div>
            <h3 className="font-semibold mb-3 text-foreground">
              {t("footer.platform.title", "Platform")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.platform.searchDoctors", "Search Doctors")}
                </Link>
              </li>
              <li>
                <Link to="/specialties" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.platform.browseSpecialties", "Browse Specialties")}
                </Link>
              </li>
              <li>
                <Link to="/practice" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.platform.findPractices", "Find Practices")}
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.platform.features", "Features")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-3 text-foreground">
              {t("footer.support.title", "Support")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.support.helpCenter", "Help Center")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.support.contact", "Contact Us")}
                </Link>
              </li>
              <li>
                <Link to="/faqs" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.support.faqs", "FAQs")}
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.support.support", "Support")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3 text-foreground">
              {t("footer.legal.title", "Legal")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.legal.about", "About Us")}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.legal.privacy", "Privacy Policy")}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.legal.terms", "Terms of Service")}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.legal.cookies", "Cookie Policy")}
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.legal.legalCenter", "Legal Center")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-3 text-foreground">
              {t("footer.support.contact", "Contact Us")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">
                {t("footer.contact.email", "contact@docito.com")}
              </li>
              <li className="text-muted-foreground">
                {t("footer.contact.phone", "+1 (555) 123-4567")}
              </li>
              <li className="text-muted-foreground">
                {t("footer.contact.location", "San Francisco, CA")}
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-border pt-6 mb-6">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-5xl mx-auto text-center">
            {t(
              "footer.disclaimer",
              "Content provided is for informational purposes only. Not intended as medical advice."
            )}
          </p>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-foreground font-medium mb-1">
              © {currentYear} <span className="font-bold text-primary">Docito®</span>{" "}
              — {t("footer.copyright", "All Rights Reserved")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("footer.trademark", "Docito is a registered trademark and brand of")}{" "}
              {t("footer.company", "Artsy Developers Inc.")}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-6 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.links.privacy", "Privacy")}
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.links.terms", "Terms")}
              </Link>
              <Link to="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.links.cookies", "Cookies")}
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.links.about", "About")}
              </Link>
            </div>

            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
