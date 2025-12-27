import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRightLeft, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextType } from '@/hooks/useHealthcareMessaging';

interface ContextBadgeProps {
  contextType: ContextType;
  size?: 'sm' | 'md';
  className?: string;
}

const contextConfig: Record<ContextType, { label: string; icon: React.ElementType; variant: string }> = {
  general: { 
    label: 'General', 
    icon: MessageSquare, 
    variant: 'bg-muted text-muted-foreground' 
  },
  visit: { 
    label: 'Visit', 
    icon: Calendar, 
    variant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
  },
  referral: { 
    label: 'Referral', 
    icon: ArrowRightLeft, 
    variant: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
  },
};

const ContextBadge: React.FC<ContextBadgeProps> = ({ 
  contextType, 
  size = 'sm',
  className 
}) => {
  const config = contextConfig[contextType] || contextConfig.general;
  const Icon = config.icon;
  const isSmall = size === 'sm';

  return (
    <Badge 
      variant="secondary"
      className={cn(
        'font-medium border-0',
        config.variant,
        isSmall ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      <Icon className={cn('mr-1', isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      {config.label}
    </Badge>
  );
};

export default ContextBadge;
