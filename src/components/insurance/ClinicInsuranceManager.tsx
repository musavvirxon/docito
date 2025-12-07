import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Globe, Lock, Clock, Check, X, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ClinicInsuranceManagerProps {
  clinicId: string;
}

interface InsuranceProvider {
  id: string;
  provider_name: string;
  country: string;
  logo_url: string | null;
  is_global: boolean;
  clinic_id: string | null;
  status: string | null;
}

interface InsuranceRequest {
  id: string;
  provider_id: string;
  status: string;
  submitted_at: string;
  reviewer_notes: string | null;
}

const COUNTRIES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Spain', 
  'UAE', 'Saudi Arabia', 'Turkey', 'Australia', 'Japan', 'China',
  'South Korea', 'Brazil', 'Mexico', 'South Africa', 'Kenya',
  'Uzbekistan', 'Kazakhstan', 'Russia', 'Other'
];

export const ClinicInsuranceManager = ({ clinicId }: ClinicInsuranceManagerProps) => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<InsuranceProvider | null>(null);
  const [formData, setFormData] = useState({
    provider_name: '',
    country: '',
    logo_url: '',
    is_public: false,
  });

  // Fetch clinic's insurance providers
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['clinic-insurance-providers', clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_providers')
        .select('*')
        .or(`clinic_id.eq.${clinicId},is_global.eq.true`)
        .order('provider_name');
      
      if (error) throw error;
      return data as InsuranceProvider[];
    },
  });

  // Fetch pending requests
  const { data: requests = [] } = useQuery({
    queryKey: ['clinic-insurance-requests', clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_insurance_requests')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data as InsuranceRequest[];
    },
  });

  // Add provider mutation
  const addProviderMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: provider, error } = await supabase
        .from('insurance_providers')
        .insert({
          provider_name: data.provider_name,
          country: data.country,
          logo_url: data.logo_url || null,
          is_global: false,
          clinic_id: clinicId,
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;

      // If requesting public, submit for approval
      if (data.is_public) {
        const { error: reqError } = await supabase.rpc('submit_insurance_for_approval', {
          p_provider_id: provider.id,
          p_clinic_id: clinicId,
        });
        if (reqError) throw reqError;
      }

      return provider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-insurance-providers'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-insurance-requests'] });
      setIsAddOpen(false);
      resetForm();
      toast.success('Insurance provider added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from('insurance_providers')
        .update({
          provider_name: data.provider_name,
          country: data.country,
          logo_url: data.logo_url || null,
        })
        .eq('id', id);
      
      if (error) throw error;

      // If requesting public and not already global
      if (data.is_public) {
        const { error: reqError } = await supabase.rpc('submit_insurance_for_approval', {
          p_provider_id: id,
          p_clinic_id: clinicId,
        });
        if (reqError) throw reqError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-insurance-providers'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-insurance-requests'] });
      setEditingProvider(null);
      resetForm();
      toast.success('Insurance provider updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const { error } = await supabase.rpc('submit_insurance_for_approval', {
        p_provider_id: providerId,
        p_clinic_id: clinicId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-insurance-providers'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-insurance-requests'] });
      toast.success('Submitted for approval');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({ provider_name: '', country: '', logo_url: '', is_public: false });
  };

  const handleEdit = (provider: InsuranceProvider) => {
    setEditingProvider(provider);
    setFormData({
      provider_name: provider.provider_name,
      country: provider.country,
      logo_url: provider.logo_url || '',
      is_public: provider.is_global,
    });
  };

  const handleSubmit = () => {
    if (!formData.provider_name || !formData.country) {
      toast.error('Please fill in required fields');
      return;
    }

    if (editingProvider) {
      updateProviderMutation.mutate({ id: editingProvider.id, ...formData });
    } else {
      addProviderMutation.mutate(formData);
    }
  };

  const getStatusBadge = (provider: InsuranceProvider) => {
    if (provider.is_global) {
      return <Badge variant="default" className="bg-green-500"><Globe className="h-3 w-3 mr-1" />Global</Badge>;
    }
    
    const request = requests.find(r => r.provider_id === provider.id);
    if (request) {
      switch (request.status) {
        case 'pending':
          return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Approval</Badge>;
        case 'approved':
          return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
        case 'rejected':
          return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
        case 'revision_requested':
          return <Badge variant="outline" className="border-amber-500 text-amber-600"><Edit className="h-3 w-3 mr-1" />Revision Needed</Badge>;
      }
    }
    
    return <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Private</Badge>;
  };

  const clinicProviders = providers.filter(p => p.clinic_id === clinicId);
  const globalProviders = providers.filter(p => p.is_global);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Insurance Management</h2>
          <p className="text-muted-foreground">Manage your clinic's accepted insurance providers</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Insurance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Insurance Provider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Provider Name *</Label>
                <Input
                  id="name"
                  value={formData.provider_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider_name: e.target.value }))}
                  placeholder="e.g., Blue Cross Blue Shield"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL (optional)</Label>
                <Input
                  id="logo"
                  value={formData.logo_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Request Public Listing</Label>
                  <p className="text-sm text-muted-foreground">
                    Submit to Super Admin for global database inclusion
                  </p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={addProviderMutation.isPending}>
                {formData.is_public ? 'Add & Submit for Approval' : 'Add Provider'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clinic's Own Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Your Clinic's Insurance Providers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clinicProviders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No custom insurance providers added yet. Add your first one above.
            </p>
          ) : (
            <div className="space-y-3">
              {clinicProviders.map(provider => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {provider.logo_url ? (
                        <img src={provider.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          {provider.provider_name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{provider.provider_name}</p>
                      <p className="text-sm text-muted-foreground">{provider.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(provider)}
                    {!provider.is_global && provider.status !== 'pending_approval' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => submitForApprovalMutation.mutate(provider.id)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Request Public
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(provider)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Insurance Providers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-h-96 overflow-y-auto">
            {globalProviders.map(provider => (
              <div
                key={provider.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {provider.logo_url ? (
                    <img src={provider.logo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-primary">
                      {provider.provider_name.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{provider.provider_name}</p>
                  <p className="text-xs text-muted-foreground">{provider.country}</p>
                </div>
                <Badge variant="secondary" className="text-xs">Global</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingProvider} onOpenChange={(open) => !open && setEditingProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Insurance Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Provider Name *</Label>
              <Input
                id="edit-name"
                value={formData.provider_name}
                onChange={(e) => setFormData(prev => ({ ...prev, provider_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-logo">Logo URL</Label>
              <Input
                id="edit-logo"
                value={formData.logo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
              />
            </div>
            {!editingProvider?.is_global && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Request Public Listing</Label>
                  <p className="text-sm text-muted-foreground">
                    Submit to Super Admin for approval
                  </p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProvider(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={updateProviderMutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
