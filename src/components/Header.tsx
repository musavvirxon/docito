import { Button } from "@/components/ui/button";
import { ChevronDown, User, LogOut, Settings, Bell as BellIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useTranslation } from 'react-i18next';
const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const {
    user,
    profile,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
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
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return <header className={`border-b border-border bg-background transition-all duration-300 z-50 ${isScrolled ? 'fixed top-1.5 left-1.5 right-1.5 rounded-lg shadow-lg' : 'relative'}`}>
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logos/horizontal/docito-horizontal-md.png" alt="Docito" className="h-8" />
          </Link>

          {/* Navigation Links */}
          

          {/* Auth Section */}
          <div className="flex items-center space-x-3">
            {user ?
          // Authenticated user
          <>
                <Button variant="secondary" className="font-medium text-sm h-9 px-4" onClick={() => navigate('/dashboard')}>
                  {t('navigation.dashboard')}
                </Button>
                
                <NotificationDropdown />
                
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
                      <span>{t('navigation.myProfile')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/notifications')}>
                      <BellIcon className="mr-2 h-4 w-4" />
                      <span>{t('navigation.notifications')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/patient-dashboard')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{t('navigation.settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('navigation.logout')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </> :
          // Non-authenticated user
          <>
                <Button variant="secondary" className="font-medium text-sm h-9 px-4" onClick={() => navigate('/doctors')}>
                  {t('navigation.forDoctors')}
                </Button>
                <Button variant="secondary" className="font-medium text-sm h-9 px-4" onClick={() => navigate('/practices')}>
                  {t('navigation.forPractices')}
                </Button>
                
                <Button variant="outline" className="font-medium text-sm h-9 px-4" onClick={() => navigate('/auth')}>
                  {t('navigation.login')}
                </Button>
                
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm h-9 px-4" onClick={() => navigate('/auth')}>
                  {t('navigation.register')}
                </Button>
              </>}
          </div>
        </nav>
      </div>
    </header>;
};
export default Header;