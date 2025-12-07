import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsuranceToggleProps {
  providerName: string;
  planName?: string;
  isAccepted: boolean;
  isInherited?: boolean;
  isLocked?: boolean;
  coverageType?: string;
  onChange: (accepted: boolean) => void;
  disabled?: boolean;
}

export const InsuranceToggle = ({
  providerName,
  planName,
  isAccepted,
  isInherited = false,
  isLocked = false,
  coverageType,
  onChange,
  disabled = false,
}: InsuranceToggleProps) => {
  const getCoverageColor = (type?: string) => {
    switch (type) {
      case 'dental':
        return 'bg-blue-100 text-blue-800';
      case 'medical':
        return 'bg-green-100 text-green-800';
      case 'full':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        isAccepted ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border',
        (isLocked || isInherited) && 'opacity-70'
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{providerName}</span>
          {planName && (
            <>
              <span className="text-muted-foreground">-</span>
              <span className="text-sm text-muted-foreground">{planName}</span>
            </>
          )}
          {coverageType && (
            <Badge className={getCoverageColor(coverageType)} variant="secondary">
              {coverageType}
            </Badge>
          )}
          {isInherited && (
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Inherited
            </Badge>
          )}
        </div>
      </div>
      <Switch
        checked={isAccepted}
        onCheckedChange={onChange}
        disabled={disabled || isLocked || isInherited}
      />
    </div>
  );
};
