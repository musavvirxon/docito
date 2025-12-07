import { Check, X, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InsuranceCompatibilityBadgeProps {
  isCompatible: boolean | null;
  providerName?: string;
  className?: string;
}

export const InsuranceCompatibilityBadge = ({
  isCompatible,
  providerName,
  className,
}: InsuranceCompatibilityBadgeProps) => {
  if (isCompatible === null) {
    return (
      <Badge 
        variant="outline" 
        className={cn('bg-muted text-muted-foreground', className)}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        Insurance not verified
      </Badge>
    );
  }

  if (isCompatible) {
    return (
      <Badge 
        variant="outline" 
        className={cn('bg-green-50 text-green-700 border-green-200', className)}
      >
        <Check className="h-3 w-3 mr-1" />
        {providerName ? `Accepts ${providerName}` : 'Accepts your insurance'}
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn('bg-red-50 text-red-700 border-red-200', className)}
    >
      <X className="h-3 w-3 mr-1" />
      {providerName ? `Does not accept ${providerName}` : 'Does not accept your insurance'}
    </Badge>
  );
};
