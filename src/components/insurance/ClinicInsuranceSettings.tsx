import { useState, useMemo } from 'react';
import { Shield, Search, Check, X, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useInsuranceProviders,
  useInsurancePlans,
  useClinicInsurance,
  useUpdateClinicInsurance,
  useInsuranceCountries,
  type InsuranceProvider,
  type InsurancePlan,
} from '@/hooks/useInsurance';

interface ClinicInsuranceSettingsProps {
  clinicId: string;
}

export const ClinicInsuranceSettings = ({ clinicId }: ClinicInsuranceSettingsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const { toast } = useToast();

  const { data: providers = [], isLoading: providersLoading } = useInsuranceProviders(
    countryFilter === 'all' ? undefined : countryFilter
  );
  const { data: allPlans = [] } = useInsurancePlans();
  const { data: clinicInsurance = [], isLoading: clinicLoading } = useClinicInsurance(clinicId);
  const { data: countries = [] } = useInsuranceCountries();
  const updateClinicInsurance = useUpdateClinicInsurance();

  // Create a map of accepted insurance
  const acceptedMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    clinicInsurance.forEach(ci => {
      const key = ci.plan_id ? `${ci.provider_id}:${ci.plan_id}` : ci.provider_id;
      map[key] = ci.is_accepted;
    });
    return map;
  }, [clinicInsurance]);

  const isProviderAccepted = (providerId: string) => {
    return acceptedMap[providerId] || false;
  };

  const isPlanAccepted = (providerId: string, planId: string) => {
    return acceptedMap[`${providerId}:${planId}`] || false;
  };

  const toggleProvider = async (provider: InsuranceProvider, accepted: boolean) => {
    try {
      await updateClinicInsurance.mutateAsync({
        clinicId,
        providerId: provider.id,
        isAccepted: accepted,
      });
    } catch (error) {
      console.error('Failed to update insurance:', error);
    }
  };

  const togglePlan = async (providerId: string, planId: string, accepted: boolean) => {
    try {
      await updateClinicInsurance.mutateAsync({
        clinicId,
        providerId,
        planId,
        isAccepted: accepted,
      });
    } catch (error) {
      console.error('Failed to update insurance:', error);
    }
  };

  const acceptAllProviders = async () => {
    for (const provider of filteredProviders) {
      if (!isProviderAccepted(provider.id)) {
        await updateClinicInsurance.mutateAsync({
          clinicId,
          providerId: provider.id,
          isAccepted: true,
        });
      }
    }
    toast({ title: 'All providers accepted' });
  };

  const clearAllProviders = async () => {
    for (const ci of clinicInsurance) {
      await updateClinicInsurance.mutateAsync({
        clinicId,
        providerId: ci.provider_id,
        planId: ci.plan_id || undefined,
        isAccepted: false,
      });
    }
    toast({ title: 'All providers cleared' });
  };

  const filteredProviders = providers.filter(p =>
    p.provider_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const acceptedCount = Object.values(acceptedMap).filter(Boolean).length;

  if (providersLoading || clinicLoading) {
    return <div className="text-center py-8">Loading insurance settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Insurance Providers
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage which insurance providers your clinic accepts ({acceptedCount} accepted)
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(country => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={acceptAllProviders}>
          <Check className="h-4 w-4 mr-1" />
          Accept All
        </Button>
        <Button variant="outline" size="sm" onClick={clearAllProviders}>
          <X className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {filteredProviders.map(provider => {
          const providerPlans = allPlans.filter(p => p.provider_id === provider.id);
          const isAccepted = isProviderAccepted(provider.id);

          return (
            <Card key={provider.id} className={isAccepted ? 'border-primary/30 bg-primary/5' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={provider.logo_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {provider.provider_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{provider.provider_name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {isAccepted ? 'Accepted' : 'Not Accepted'}
                    </span>
                    <Switch
                      checked={isAccepted}
                      onCheckedChange={(checked) => toggleProvider(provider, checked)}
                    />
                  </div>
                </div>

                {providerPlans.length > 0 && (
                  <div className="space-y-2 ml-13">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Plans</p>
                    {providerPlans.map(plan => {
                      const planAccepted = isPlanAccepted(provider.id, plan.id);
                      return (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{plan.plan_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {plan.coverage_type}
                            </Badge>
                          </div>
                          <Switch
                            checked={planAccepted}
                            onCheckedChange={(checked) => togglePlan(provider.id, plan.id, checked)}
                            disabled={!isAccepted}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredProviders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No providers found matching your search
          </div>
        )}
      </div>
    </div>
  );
};
