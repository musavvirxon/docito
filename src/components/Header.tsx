import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [authModal, setAuthModal] = useState<{ 
    isOpen: boolean; 
    userType?: "patient" | "doctor" | "practice";
    mode?: "signin" | "signup";
  }>({
    isOpen: false,
    userType: "patient",
    mode: "signin"
  });

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 0);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`border-b border-border bg-background transition-all duration-300 z-50 ${
      isScrolled ? 'fixed top-1.5 left-1.5 right-1.5 rounded-lg shadow-lg' : 'relative'
    }`}>
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center mr-2">
              <span className="text-foreground font-bold text-lg">Z</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Zocdoc</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6">
            <div className="flex items-center space-x-1 cursor-pointer">
              <span className="text-foreground text-sm">Browse</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
            <a href="#" className="text-foreground hover:text-primary text-sm">Help</a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-3">
            {/* Dashboard button if signed in (mock check for now) */}
            <Button 
              variant="secondary" 
              className="font-medium text-sm h-9 px-4"
              onClick={() => window.location.href = '/patient-dashboard'}
            >
              Dashboard
            </Button>
            
            <Button 
              variant="secondary" 
              className="font-medium text-sm h-9 px-4"
              onClick={() => window.location.href = '/doctors'}
            >
              For Doctors
            </Button>
            <Button 
              variant="secondary" 
              className="font-medium text-sm h-9 px-4"
              onClick={() => window.location.href = '/practices'}
            >
              For Private Practices
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-1 cursor-pointer px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                  <span className="text-foreground text-sm">Log in</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-background border border-border shadow-lg" align="end">
                <DropdownMenuItem 
                  onClick={() => setAuthModal({ isOpen: true, userType: "patient", mode: "signin" })}
                  className="cursor-pointer"
                >
                  Individual
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setAuthModal({ isOpen: true, userType: "doctor", mode: "signin" })}
                  className="cursor-pointer"
                >
                  Doctor
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setAuthModal({ isOpen: true, userType: "practice", mode: "signin" })}
                  className="cursor-pointer"
                >
                  Private Practice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              className="bg-yellow-400 text-foreground hover:bg-yellow-500 font-medium text-sm h-9 px-4"
              onClick={() => window.location.href = '/signup'}
            >
              Sign up
            </Button>
          </div>
        </nav>
      </div>
      
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ isOpen: false, userType: "patient", mode: "signin" })}
        userType={authModal.userType}
        mode={authModal.mode}
      />
    </header>
  );
};

export default Header;