import { Building2, MapPin, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { InsuranceProvider, InsurancePlan } from '@/hooks/useInsurance';

interface InsuranceProviderCardProps {
  provider: InsuranceProvider;
  plans?: InsurancePlan[];
  showActions?: boolean;
  onEdit?: (provider: InsuranceProvider) => void;
  onDelete?: (provider: InsuranceProvider) => void;
  onEditPlan?: (plan: InsurancePlan) => void;
  onDeletePlan?: (plan: InsurancePlan) => void;
  onAddPlan?: (provider: InsuranceProvider) => void;
}

export const InsuranceProviderCard = ({
  provider,
  plans = [],
  showActions = false,
  onEdit,
  onDelete,
  onEditPlan,
  onDeletePlan,
  onAddPlan,
}: InsuranceProviderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getCoverageColor = (type: string) => {
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
    <Card className="border border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={provider.logo_url || ''} alt={provider.provider_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {provider.provider_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{provider.provider_name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{provider.country}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showActions && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit?.(provider)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete?.(provider)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground"
            >
              <span className="text-sm mr-1">{plans.length} plans</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{plan.plan_name}</span>
                    <Badge className={getCoverageColor(plan.coverage_type)} variant="secondary">
                      {plan.coverage_type}
                    </Badge>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  )}
                </div>
                {showActions && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditPlan?.(plan)}
                      className="h-7 w-7"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeletePlan?.(plan)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {showActions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddPlan?.(provider)}
                className="w-full mt-2"
              >
                + Add Plan
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
