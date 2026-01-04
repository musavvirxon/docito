import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import ModernNavbar from '@/components/home/ModernNavbar';
import ModernFooter from '@/components/home/ModernFooter';
import { useAuth } from '@/contexts/AuthContext';
import ProfileMenu from '@/components/dashboard/ProfileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/home/ThemeToggle';

interface PublicShellProps {
  children: ReactNode;
  className?: string;
  showNavbar?: boolean;
  showFooter?: boolean;
  showTopBar?: boolean;
}

/**
 * PublicShell - Unified wrapper for all public pages
 * Ensures consistent header/footer and ProfileMenu when logged in
 */
export function PublicShell({
  children,
  className,
  showNavbar = true,
  showFooter = true,
  showTopBar = false,
}: PublicShellProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showNavbar && <ModernNavbar />}
      
      {showTopBar && (
        <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-end gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            {user && <ProfileMenu />}
          </div>
        </div>
      )}
      
      <main className={cn("flex-1", className)}>
        {children}
      </main>
      
      {showFooter && <ModernFooter />}
    </div>
  );
}

export default PublicShell;
