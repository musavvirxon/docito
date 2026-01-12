import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardBrandingProps {
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DashboardBranding({ 
  className, 
  showIcon = true,
  size = 'md' 
}: DashboardBrandingProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <div className="relative">
          <Heart className={cn(iconSizes[size], "text-primary fill-primary")} />
          <Heart 
            className={cn(
              iconSizes[size], 
              "text-primary/30 fill-primary/30 absolute inset-0 animate-ping"
            )} 
            style={{ animationDuration: '2s' }}
          />
        </div>
      )}
      <span className={cn(
        "font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent",
        sizeClasses[size]
      )}>
        Docito
      </span>
    </div>
  );
}
