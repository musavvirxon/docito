import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

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
  const logoSizes = {
    sm: { className: 'h-6', width: 80, height: 24 },
    md: { className: 'h-8', width: 107, height: 32 },
    lg: { className: 'h-10', width: 133, height: 40 },
  };

  const logoConfig = logoSizes[size];

  return (
    <Link 
      to="/" 
      className={cn("flex items-center gap-2 hover:opacity-80 transition-opacity", className)}
    >
      <img
        src="/logos/horizontal/docito-horizontal-sm.png"
        alt="Docito"
        className={cn(logoConfig.className, "object-contain")}
        width={logoConfig.width}
        height={logoConfig.height}
      />
    </Link>
  );
}
