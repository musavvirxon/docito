import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

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
            <h3 className="font-semibold mb-3 text-foreground">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/doctors" className="text-muted-foreground hover:text-primary transition-colors">Find Doctors</Link></li>
              <li><Link to="/practices" className="text-muted-foreground hover:text-primary transition-colors">Practices</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-foreground">For Providers</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/doctor-signup" className="text-muted-foreground hover:text-primary transition-colors">Join as Provider</Link></li>
              <li><Link to="/register-practice" className="text-muted-foreground hover:text-primary transition-colors">Register Practice</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-foreground">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">Legal Center</Link></li>
              <li><a href="mailto:info@docito.com" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/legal/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/legal/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal/cookie-policy" className="text-muted-foreground hover:text-primary transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div className="border-t border-border pt-6 mb-6">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl mx-auto text-center">
            The content provided on Docito is for general informational purposes only. It is not intended as, and Docito does not provide, medical advice, diagnosis or treatment. Always contact your healthcare provider directly with any questions you may have regarding your health or specific medical advice.
          </p>
        </div>

        {/* Copyright and Social */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-foreground font-medium mb-1">
              © {currentYear} <span className="font-bold text-primary">Docito®</span> - All Rights Reserved
            </p>
            <p className="text-xs text-muted-foreground mb-1">
              Docito is a registered trademark and brand of <span className="font-semibold">Artsy Developers Inc.</span>
            </p>
            <p className="text-xs text-muted-foreground">
              All services, features, and intellectual property are protected under applicable patent laws.
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