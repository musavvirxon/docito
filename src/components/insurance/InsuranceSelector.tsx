import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Shield, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useInsuranceProviders, useInsurancePlans } from '@/hooks/useInsurance';

interface InsuranceSelectorProps {
  selectedProviderId?: string;
  selectedPlanId?: string;
  onSelect: (providerId: string | undefined, planId: string | undefined) => void;
  placeholder?: string;
  showPlanSelector?: boolean;
  className?: string;
}

export const InsuranceSelector = ({
  selectedProviderId,
  selectedPlanId,
  onSelect,
  placeholder = 'Select insurance...',
  showPlanSelector = true,
  className,
}: InsuranceSelectorProps) => {
  const [providerOpen, setProviderOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  const { data: providers = [] } = useInsuranceProviders();
  const { data: plans = [] } = useInsurancePlans(selectedProviderId);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Group providers by country
  const groupedProviders = useMemo(() => {
    const grouped: Record<string, typeof providers> = {};
    providers.forEach(provider => {
      if (!grouped[provider.country]) {
        grouped[provider.country] = [];
      }
      grouped[provider.country].push(provider);
    });
    return grouped;
  }, [providers]);

  const handleProviderSelect = (providerId: string) => {
    if (providerId === selectedProviderId) {
      onSelect(undefined, undefined);
    } else {
      onSelect(providerId, undefined);
    }
    setProviderOpen(false);
  };

  const handlePlanSelect = (planId: string) => {
    if (planId === selectedPlanId) {
      onSelect(selectedProviderId, undefined);
    } else {
      onSelect(selectedProviderId, planId);
    }
    setPlanOpen(false);
  };

  return (
    <div className={cn('flex flex-col sm:flex-row gap-2', className)}>
      {/* Provider Selector */}
      <Popover open={providerOpen} onOpenChange={setProviderOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={providerOpen}
            className="justify-between min-w-[200px]"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              {selectedProvider ? (
                <span className="truncate">{selectedProvider.provider_name}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search insurance providers..." />
            <CommandList>
              <CommandEmpty>No provider found.</CommandEmpty>
              {Object.entries(groupedProviders).map(([country, countryProviders]) => (
                <CommandGroup key={country} heading={country}>
                  {countryProviders.map((provider) => (
                    <CommandItem
                      key={provider.id}
                      value={provider.provider_name}
                      onSelect={() => handleProviderSelect(provider.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedProviderId === provider.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {provider.provider_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Plan Selector */}
      {showPlanSelector && selectedProviderId && (
        <Popover open={planOpen} onOpenChange={setPlanOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={planOpen}
              className="justify-between min-w-[200px]"
            >
              {selectedPlan ? (
                <div className="flex items-center gap-2">
                  <span className="truncate">{selectedPlan.plan_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedPlan.coverage_type}
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground">Select plan (optional)</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search plans..." />
              <CommandList>
                <CommandEmpty>No plan found.</CommandEmpty>
                <CommandGroup>
                  {plans.map((plan) => (
                    <CommandItem
                      key={plan.id}
                      value={plan.plan_name}
                      onSelect={() => handlePlanSelect(plan.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedPlanId === plan.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <span>{plan.plan_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {plan.coverage_type}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear button */}
      {selectedProviderId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelect(undefined, undefined)}
          className="text-muted-foreground"
        >
          Clear
        </Button>
      )}
    </div>
  );
};
