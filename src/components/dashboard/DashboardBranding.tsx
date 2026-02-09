import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

interface DashboardBrandingProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DashboardBranding({ 
  className, 
  showText = true,
  size = 'md' 
}: DashboardBrandingProps) {
  const { appliedTheme } = useTheme();

  const logoSizes = {
    sm: { className: 'h-6', width: 80, height: 24 },
    md: { className: 'h-8', width: 107, height: 32 },
    lg: { className: 'h-10', width: 133, height: 40 },
  };

  const logoConfig = logoSizes[size];

  // Theme-aware logo with transparent background
  const logoSrc = appliedTheme === 'dark'
    ? '/logos/logo-full-dark.png'
    : '/logos/logo-full-light.png';

  return (
    <Link 
      to="/" 
      className={cn("flex items-center gap-2 hover:opacity-80 transition-opacity", className)}
    >
      <img
        src={logoSrc}
        alt="Docito"
        className={cn(logoConfig.className, "object-contain")}
        width={logoConfig.width}
        height={logoConfig.height}
      />
    </Link>
  );
}
