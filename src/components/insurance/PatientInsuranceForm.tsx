import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Upload, Calendar, CreditCard, Phone, FileText, Trash2, Download, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InsuranceSelector } from '@/components/insurance/InsuranceSelector';
import { 
  usePatientInsurance, 
  useAddPatientInsurance, 
  useUpdatePatientInsurance, 
  useDeletePatientInsurance,
  useInsuranceProviders,
  useInsurancePlans,
  type PatientInsurance 
} from '@/hooks/useInsurance';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const insuranceSchema = z.object({
  provider_id: z.string().min(1, 'Provider is required'),
  plan_id: z.string().optional(),
  member_id: z.string().min(1, 'Member ID is required'),
  group_number: z.string().optional(),
  valid_until: z.string().optional(),
  co_pay: z.number().optional(),
  deductible: z.number().optional(),
  annual_limit: z.number().optional(),
  provider_phone: z.string().optional(),
  notes: z.string().optional(),
  covers_emergency: z.boolean().default(true),
  is_primary: z.boolean().default(true),
});

type InsuranceFormData = z.infer<typeof insuranceSchema>;

interface PatientInsuranceFormProps {
  patientId: string;
  onSaved?: () => void;
}

export const PatientInsuranceForm = ({ patientId, onSaved }: PatientInsuranceFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [insuranceToDelete, setInsuranceToDelete] = useState<PatientInsurance | null>(null);
  const { toast } = useToast();

  const { data: insurances = [], isLoading, refetch } = usePatientInsurance(patientId);
  const { data: providers = [] } = useInsuranceProviders();
  const addInsurance = useAddPatientInsurance();
  const updateInsurance = useUpdatePatientInsurance();
  const deleteInsurance = useDeletePatientInsurance();

  const primaryInsurance = insurances.find(i => i.is_primary);
  const secondaryInsurance = insurances.find(i => !i.is_primary);

  const form = useForm<InsuranceFormData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      provider_id: '',
      plan_id: '',
      member_id: '',
      group_number: '',
      valid_until: '',
      co_pay: undefined,
      deductible: undefined,
      annual_limit: undefined,
      provider_phone: '',
      notes: '',
      covers_emergency: true,
      is_primary: true,
    },
  });

  const handleEdit = (insurance: PatientInsurance, isPrimary: boolean) => {
    setEditingId(insurance.id);
    setIsEditing(true);
    form.reset({
      provider_id: insurance.provider_id,
      plan_id: insurance.plan_id || '',
      member_id: insurance.member_id || '',
      group_number: insurance.group_number || '',
      valid_until: insurance.valid_until || '',
      co_pay: insurance.co_pay ?? undefined,
      deductible: insurance.deductible ?? undefined,
      annual_limit: insurance.annual_limit ?? undefined,
      provider_phone: insurance.provider_phone || '',
      notes: insurance.notes || '',
      covers_emergency: insurance.covers_emergency ?? true,
      is_primary: isPrimary,
    });
  };

  const handleAddNew = (isPrimary: boolean) => {
    setEditingId(null);
    setIsEditing(true);
    form.reset({
      provider_id: '',
      plan_id: '',
      member_id: '',
      group_number: '',
      valid_until: '',
      co_pay: undefined,
      deductible: undefined,
      annual_limit: undefined,
      provider_phone: '',
      notes: '',
      covers_emergency: true,
      is_primary: isPrimary,
    });
    if (!isPrimary) setShowSecondary(true);
  };

  const onSubmit = async (data: InsuranceFormData) => {
    try {
      const payload = {
        patient_id: patientId,
        provider_id: data.provider_id,
        plan_id: data.plan_id || null,
        member_id: data.member_id,
        valid_until: data.valid_until || null,
        is_primary: data.is_primary,
        status: 'active',
      };

      if (editingId) {
        await updateInsurance.mutateAsync({ id: editingId, ...payload });
      } else {
        await addInsurance.mutateAsync(payload as any);
      }

      setIsEditing(false);
      setEditingId(null);
      refetch();
      onSaved?.();
    } catch (error) {
      console.error('Failed to save insurance:', error);
    }
  };

  const handleDelete = async () => {
    if (!insuranceToDelete) return;
    try {
      await deleteInsurance.mutateAsync(insuranceToDelete.id);
      setDeleteDialogOpen(false);
      setInsuranceToDelete(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete insurance:', error);
    }
  };

  const getExpirationStatus = (validUntil: string | null) => {
    if (!validUntil) return null;
    const expirationDate = new Date(validUntil);
    if (isPast(expirationDate)) {
      return { status: 'expired', label: 'Expired', variant: 'destructive' as const };
    }
    const daysUntilExpiry = differenceInDays(expirationDate, new Date());
    if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `Expires in ${daysUntilExpiry} days`, variant: 'outline' as const };
    }
    return { status: 'active', label: 'Active', variant: 'default' as const };
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading insurance information...</div>;
  }

  // Editing mode form
  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {editingId ? 'Edit Insurance' : 'Add Insurance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Provider & Plan Selection */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="provider_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Provider *</FormLabel>
                      <FormControl>
                        <InsuranceSelector
                          selectedProviderId={field.value}
                          selectedPlanId={form.watch('plan_id')}
                          onSelect={(providerId, planId) => {
                            field.onChange(providerId || '');
                            form.setValue('plan_id', planId || '');
                          }}
                          placeholder="Select your insurance provider"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="member_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Member ID / Policy Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter member ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="group_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter group number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Coverage Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Coverage Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="co_pay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Co-pay Amount ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field} 
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deductible"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deductible ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="annual_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Limit ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="covers_emergency"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Covers Emergency Care</FormLabel>
                        <p className="text-sm text-muted-foreground">Does this plan cover emergency visits?</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Contact & Notes */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="provider_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about your coverage..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addInsurance.isPending || updateInsurance.isPending}>
                  {editingId ? 'Update' : 'Save'} Insurance
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  // Display mode
  const InsuranceCard = ({ insurance, title }: { insurance: PatientInsurance | undefined; title: string }) => {
    if (!insurance) {
      return (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">No insurance added yet</p>
            <Button onClick={() => handleAddNew(title === 'Primary Insurance')}>
              Add {title}
            </Button>
          </CardContent>
        </Card>
      );
    }

    const expStatus = getExpirationStatus(insurance.valid_until);
    const provider = providers.find(p => p.id === insurance.provider_id);

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={provider?.logo_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {provider?.provider_name?.substring(0, 2).toUpperCase() || 'IN'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{provider?.provider_name || 'Unknown Provider'}</CardTitle>
                {insurance.plan && (
                  <CardDescription>{insurance.plan.plan_name}</CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {expStatus && (
                <Badge 
                  variant={expStatus.variant}
                  className={expStatus.status === 'expiring' ? 'text-yellow-600 border-yellow-600' : ''}
                >
                  {expStatus.status === 'expiring' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {expStatus.label}
                </Badge>
              )}
              {insurance.is_primary && (
                <Badge variant="secondary">Primary</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Member ID</span>
              <p className="font-medium">{insurance.member_id || 'N/A'}</p>
            </div>
            {insurance.group_number && (
              <div>
                <span className="text-muted-foreground">Group Number</span>
                <p className="font-medium">{insurance.group_number}</p>
              </div>
            )}
            {insurance.valid_until && (
              <div>
                <span className="text-muted-foreground">Valid Until</span>
                <p className="font-medium">{format(new Date(insurance.valid_until), 'MMM d, yyyy')}</p>
              </div>
            )}
            {insurance.co_pay && (
              <div>
                <span className="text-muted-foreground">Co-pay</span>
                <p className="font-medium">${insurance.co_pay}</p>
              </div>
            )}
            {insurance.deductible && (
              <div>
                <span className="text-muted-foreground">Deductible</span>
                <p className="font-medium">${insurance.deductible}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => handleEdit(insurance, insurance.is_primary)}>
              Update
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive"
              onClick={() => {
                setInsuranceToDelete(insurance);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Insurance Information
          </h2>
          <p className="text-sm text-muted-foreground">Manage your insurance coverage details</p>
        </div>
      </div>

      <InsuranceCard insurance={primaryInsurance} title="Primary Insurance" />

      {(showSecondary || secondaryInsurance) && (
        <InsuranceCard insurance={secondaryInsurance} title="Secondary Insurance" />
      )}

      {!showSecondary && !secondaryInsurance && primaryInsurance && (
        <Button variant="outline" onClick={() => handleAddNew(false)}>
          + Add Secondary Insurance
        </Button>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Insurance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this insurance? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
