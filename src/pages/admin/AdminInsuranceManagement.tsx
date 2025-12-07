import { useState } from 'react';
import { Plus, Search, Shield, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { InsuranceProviderCard } from '@/components/insurance/InsuranceProviderCard';
import {
  useInsuranceProviders,
  useInsurancePlans,
  useInsuranceCountries,
  useCreateInsuranceProvider,
  useUpdateInsuranceProvider,
  useDeleteInsuranceProvider,
  useCreateInsurancePlan,
  useUpdateInsurancePlan,
  useDeleteInsurancePlan,
  type InsuranceProvider,
  type InsurancePlan,
} from '@/hooks/useInsurance';

const AdminInsuranceManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [providerDialog, setProviderDialog] = useState<{ open: boolean; provider?: InsuranceProvider }>({ open: false });
  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan?: InsurancePlan; providerId?: string }>({ open: false });
  const [formData, setFormData] = useState({ provider_name: '', country: '', logo_url: '' });
  const [planFormData, setPlanFormData] = useState({ plan_name: '', description: '', coverage_type: 'full' });

  const { data: providers = [], isLoading } = useInsuranceProviders(countryFilter === 'all' ? undefined : countryFilter);
  const { data: allPlans = [] } = useInsurancePlans();
  const { data: countries = [] } = useInsuranceCountries();

  const createProvider = useCreateInsuranceProvider();
  const updateProvider = useUpdateInsuranceProvider();
  const deleteProvider = useDeleteInsuranceProvider();
  const createPlan = useCreateInsurancePlan();
  const updatePlan = useUpdateInsurancePlan();
  const deletePlan = useDeleteInsurancePlan();

  const filteredProviders = providers.filter(p =>
    p.provider_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProviderSubmit = () => {
    if (providerDialog.provider) {
      updateProvider.mutate({ id: providerDialog.provider.id, ...formData });
    } else {
      createProvider.mutate({ ...formData, is_global: true } as any);
    }
    setProviderDialog({ open: false });
    setFormData({ provider_name: '', country: '', logo_url: '' });
  };

  const handlePlanSubmit = () => {
    if (planDialog.plan) {
      updatePlan.mutate({ id: planDialog.plan.id, ...planFormData });
    } else if (planDialog.providerId) {
      createPlan.mutate({ provider_id: planDialog.providerId, ...planFormData });
    }
    setPlanDialog({ open: false });
    setPlanFormData({ plan_name: '', description: '', coverage_type: 'full' });
  };

  const openEditProvider = (provider: InsuranceProvider) => {
    setFormData({ provider_name: provider.provider_name, country: provider.country, logo_url: provider.logo_url || '' });
    setProviderDialog({ open: true, provider });
  };

  const openEditPlan = (plan: InsurancePlan) => {
    setPlanFormData({ plan_name: plan.plan_name, description: plan.description || '', coverage_type: plan.coverage_type });
    setPlanDialog({ open: true, plan });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Insurance Management
          </h1>
          <p className="text-muted-foreground">Manage global insurance providers and plans</p>
        </div>
        <Button onClick={() => setProviderDialog({ open: true })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </div>

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

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {filteredProviders.map(provider => (
            <InsuranceProviderCard
              key={provider.id}
              provider={provider}
              plans={allPlans.filter(p => p.provider_id === provider.id)}
              showActions
              onEdit={openEditProvider}
              onDelete={(p) => deleteProvider.mutate(p.id)}
              onEditPlan={openEditPlan}
              onDeletePlan={(p) => deletePlan.mutate(p.id)}
              onAddPlan={(p) => setPlanDialog({ open: true, providerId: p.id })}
            />
          ))}
          {filteredProviders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No providers found</div>
          )}
        </div>
      )}

      {/* Provider Dialog */}
      <Dialog open={providerDialog.open} onOpenChange={(open) => setProviderDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{providerDialog.provider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider Name</Label>
              <Input value={formData.provider_name} onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })} />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialog({ open: false })}>Cancel</Button>
            <Button onClick={handleProviderSubmit}>{providerDialog.provider ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={planDialog.open} onOpenChange={(open) => setPlanDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{planDialog.plan ? 'Edit Plan' : 'Add Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan Name</Label>
              <Input value={planFormData.plan_name} onChange={(e) => setPlanFormData({ ...planFormData, plan_name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={planFormData.description} onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })} />
            </div>
            <div>
              <Label>Coverage Type</Label>
              <Select value={planFormData.coverage_type} onValueChange={(v) => setPlanFormData({ ...planFormData, coverage_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog({ open: false })}>Cancel</Button>
            <Button onClick={handlePlanSubmit}>{planDialog.plan ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInsuranceManagement;
