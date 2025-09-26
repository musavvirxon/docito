import { Button } from "@/components/ui/button";
import { ChevronDown, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

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
            <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center mr-2">
              <span className="text-primary-foreground font-bold text-lg">Z</span>
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

          {/* Auth Section */}
          <div className="flex items-center space-x-3">
            {user ? (
              // Authenticated user
              <>
                <Button 
                  variant="secondary" 
                  className="font-medium text-sm h-9 px-4"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                        <AvatarFallback>
                          {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // Non-authenticated user
              <>
                <Button 
                  variant="secondary" 
                  className="font-medium text-sm h-9 px-4"
                  onClick={() => navigate('/doctors')}
                >
                  For Doctors
                </Button>
                <Button 
                  variant="secondary" 
                  className="font-medium text-sm h-9 px-4"
                  onClick={() => navigate('/practices')}
                >
                  For Private Practices
                </Button>
                
                <Button 
                  variant="outline"
                  className="font-medium text-sm h-9 px-4"
                  onClick={() => navigate('/auth')}
                >
                  Log in
                </Button>
                
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm h-9 px-4"
                  onClick={() => navigate('/auth')}
                >
                  Sign up
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;