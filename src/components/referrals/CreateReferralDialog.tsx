// src/components/referrals/CreateReferralDialog.tsx
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Search, UserRound, UsersRound } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

import { cn } from '@/lib/utils';
import { searchReceivers, getEstimatedDuration } from '@/lib/api/referral-api';
import type { ReferralEntityType, ReferralPriority, ReferralType, CreateReferralInput } from '@/hooks/useReferrals';

type PatientMode = 'registered' | 'manual';
type ReferralScope = 'general' | 'specific';

const RADIO_TILE =
  'flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-sm';

const RADIO_TILE_STACK =
  'flex flex-col rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer';

const receiverTypeOptions: { value: ReferralEntityType; label: string }[] = [
  { value: 'doctor', label: 'Doctor / Specialist' },
  { value: 'clinic', label: 'Clinic / Hospital' },
  { value: 'lab', label: 'Laboratory' },
  { value: 'imaging_center', label: 'Imaging Center' },
  { value: 'pharmacy', label: 'Pharmacy' },
];

const referralTypeOptions: { value: ReferralType; label: string; forTypes: ReferralEntityType[] }[] = [
  { value: 'consultation', label: 'Medical Consultation', forTypes: ['doctor', 'clinic'] },
  { value: 'specialist_referral', label: 'Specialist Referral', forTypes: ['doctor', 'clinic'] },
  { value: 'follow_up_care', label: 'Follow-up Care', forTypes: ['doctor', 'clinic'] },
  { value: 'lab_test', label: 'Laboratory Test', forTypes: ['lab', 'clinic'] },
  { value: 'imaging_study', label: 'Imaging Study', forTypes: ['imaging_center', 'clinic'] },
  { value: 'prescription_fulfillment', label: 'Prescription Fulfillment', forTypes: ['pharmacy'] },
];

const referralSchema = z
  .object({
    patient_mode: z.enum(['registered', 'manual']),
    patient_id: z.string().optional().nullable(),
    external_patient_ref: z.string().optional().nullable(),
    patient_name: z.string().optional().nullable(),
    patient_email: z.string().optional().nullable(),
    patient_phone: z.string().optional().nullable(),

    scope: z.enum(['general', 'specific']),
    target_specialty_key: z.string().optional().nullable(),
    target_service_label: z.string().optional().nullable(),

    receiver_type: z.enum(['doctor', 'clinic', 'lab', 'imaging_center', 'pharmacy']),
    receiver_entity_id: z.string().optional().nullable(),

    referral_type: z.enum([
      'consultation',
      'lab_test',
      'imaging_study',
      'prescription_fulfillment',
      'follow_up_care',
      'specialist_referral',
    ]),
    priority: z.enum(['routine', 'urgent', 'stat']),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
    clinical_notes: z.string().optional().nullable(),
    valid_until: z.date(),
    preferred_date: z.date().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const mode = val.patient_mode as PatientMode;
    const scope = val.scope as ReferralScope;

    if (mode === 'registered') {
      if (!val.patient_id || val.patient_id.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patient_id'], message: 'Patient is required' });
      }
    } else {
      const name = (val.patient_name || '').trim();
      const email = (val.patient_email || '').trim();
      const phone = (val.patient_phone || '').trim();

      if (name.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patient_name'], message: 'Patient name is required' });
      }
      if (!email && !phone) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patient_email'], message: 'Email or phone is required' });
      }
      if (email) {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patient_email'], message: 'Invalid email address' });
      }
    }

    if (scope === 'specific') {
      if (!val.receiver_entity_id || val.receiver_entity_id.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['receiver_entity_id'], message: 'Please select a receiver' });
      }
    } else {
      if (val.receiver_type === 'doctor' || val.receiver_type === 'clinic') {
        if (!val.target_specialty_key || val.target_specialty_key.trim().length < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_specialty_key'], message: 'Specialty / field is required' });
        }
      } else {
        if (!val.target_service_label || val.target_service_label.trim().length < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_service_label'], message: 'Service / department is required' });
        }
      }
    }
  });

type FormData = z.infer<typeof referralSchema>;

export interface CreateReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  onSubmit: (data: CreateReferralInput) => Promise<void>;
  initialPatientMode?: PatientMode;
  initialManualPatient?: {
    external_patient_ref?: string | null;
    patient_name?: string | null;
    patient_email?: string | null;
    patient_phone?: string | null;
  };
  initialScope?: ReferralScope;
}

export const CreateReferralDialog = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  onSubmit,
  initialPatientMode,
  initialManualPatient,
  initialScope,
}: CreateReferralDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [receivers, setReceivers] = useState<any[]>([]);
  const [loadingReceivers, setLoadingReceivers] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      patient_mode: initialPatientMode || 'registered',
      patient_id: initialPatientMode === 'manual' ? null : patientId,
      external_patient_ref: initialManualPatient?.external_patient_ref ?? null,
      patient_name: initialManualPatient?.patient_name ?? (initialPatientMode === 'manual' ? patientName : null),
      patient_email: initialManualPatient?.patient_email ?? null,
      patient_phone: initialManualPatient?.patient_phone ?? null,

      scope: initialScope || 'specific',
      target_specialty_key: null,
      target_service_label: null,

      receiver_type: 'doctor',
      receiver_entity_id: null,

      referral_type: 'consultation',
      priority: 'routine',
      reason: '',
      clinical_notes: null,
      valid_until: addDays(new Date(), 30),
      preferred_date: null,
    },
  });

  const patientMode = form.watch('patient_mode');
  const scope = form.watch('scope');
  const selectedReceiverType = form.watch('receiver_type');
  const selectedReferralType = form.watch('referral_type');

  const isGeneral = scope === 'general';

  const filteredReferralTypes = useMemo(
    () => referralTypeOptions.filter((opt) => opt.forTypes.includes(selectedReceiverType)),
    [selectedReceiverType]
  );

  useEffect(() => {
    if (scope !== 'specific') {
      setReceivers([]);
      setLoadingReceivers(false);
      return;
    }

    const search = async () => {
      setLoadingReceivers(true);
      try {
        const results = await searchReceivers(selectedReceiverType, searchTerm);
        setReceivers(results);
      } catch (error) {
        console.error('Error searching receivers:', error);
      } finally {
        setLoadingReceivers(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [scope, selectedReceiverType, searchTerm]);

  useEffect(() => {
    form.setValue('receiver_entity_id', null);
    if (scope === 'general') {
      setSearchTerm('');
      setReceivers([]);
    }
    if (!filteredReferralTypes.find((t) => t.value === selectedReferralType)) {
      form.setValue('referral_type', filteredReferralTypes[0]?.value || 'consultation');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedReceiverType]);

  useEffect(() => {
    if (patientMode === 'registered') form.setValue('patient_id', patientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientMode, patientId]);

  const getReceiverDisplayName = (receiver: any) => {
    if (selectedReceiverType === 'doctor') return receiver.profiles?.full_name || 'Unknown Doctor';
    return receiver.name || 'Unknown';
  };

  const getReceiverSubtext = (receiver: any) => {
    if (selectedReceiverType === 'doctor') return `${receiver.specialty} • ${receiver.practices?.name || 'Independent'}`;
    return `${receiver.city || ''}${receiver.country ? `, ${receiver.country}` : ''}`;
  };

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const isManual = data.patient_mode === 'manual';
      const isSpecific = data.scope === 'specific';

      const payload: any = {
        patient_id: isManual ? null : (data.patient_id || patientId),
        receiver_type: data.receiver_type,
        receiver_entity_id: isSpecific ? data.receiver_entity_id : null,
        referral_type: data.referral_type,
        priority: data.priority as ReferralPriority,
        reason: data.reason,
        clinical_notes: data.clinical_notes || undefined,
        valid_until: format(data.valid_until, 'yyyy-MM-dd'),
        preferred_date: data.preferred_date ? format(data.preferred_date, 'yyyy-MM-dd') : undefined,
        estimated_duration_minutes: getEstimatedDuration(data.referral_type, data.receiver_type),

        scope: data.scope,
        target_specialty_key:
          data.scope === 'general' && (data.receiver_type === 'doctor' || data.receiver_type === 'clinic')
            ? (data.target_specialty_key || '').trim() || null
            : null,
        target_service_label:
          data.scope === 'general' && !(data.receiver_type === 'doctor' || data.receiver_type === 'clinic')
            ? (data.target_service_label || '').trim() || null
            : null,

        external_patient_ref: isManual ? (data.external_patient_ref || '').trim() || null : null,
        patient_name: isManual ? (data.patient_name || '').trim() || null : null,
        patient_email: isManual ? (data.patient_email || '').trim() || null : null,
        patient_phone: isManual ? (data.patient_phone || '').trim() || null : null,
      };

      await onSubmit(payload as CreateReferralInput);
      onOpenChange(false);
      form.reset({
        ...form.getValues(),
        reason: '',
        clinical_notes: null,
        preferred_date: null,
        receiver_entity_id: null,
        target_specialty_key: null,
        target_service_label: null,
      });
    } catch (error) {
      console.error('Error creating referral:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientDisplayName = useMemo(() => {
    if (patientMode === 'manual') {
      const n = (form.getValues('patient_name') || '').trim();
      return n || 'Manual patient';
    }
    return patientName;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientMode, patientName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Referral</DialogTitle>
          <DialogDescription>Create a referral for {patientDisplayName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-4">
              <FormField
                control={form.control}
                name="patient_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-2">
                        <div>
                          <RadioGroupItem value="registered" id="patient_registered" className="peer sr-only" />
                          <Label htmlFor="patient_registered" className={RADIO_TILE}>
                            <UsersRound className="h-4 w-4" />
                            Registered
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="manual" id="patient_manual" className="peer sr-only" />
                          <Label htmlFor="patient_manual" className={RADIO_TILE}>
                            <UserRound className="h-4 w-4" />
                            Manual
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>Registered = in-app. Manual = printable card.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {patientMode === 'registered' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="patient_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registered Patient</FormLabel>
                          <FormControl>
                            <Input value={patientName} readOnly disabled className="opacity-100" />
                          </FormControl>
                          <input type="hidden" value={field.value ?? ''} onChange={() => {}} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="external_patient_ref"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>External Patient Ref (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="MRN / chart # / external ID"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ) : (
                <Card className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="patient_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="external_patient_ref"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>External Patient Ref (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="MRN / chart # / external ID"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patient_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Optional)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patient_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 555 000 0000" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Provide email or phone for contact.</p>
                </Card>
              )}

              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Scope</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <RadioGroupItem value="specific" id="scope_specific" className="peer sr-only" />
                          <Label htmlFor="scope_specific" className={RADIO_TILE_STACK}>
                            <span className="font-medium text-sm">Specific referral</span>
                            <span className="text-xs text-muted-foreground">Refer to a specific provider.</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="general" id="scope_general" className="peer sr-only" />
                          <Label htmlFor="scope_general" className={RADIO_TILE_STACK}>
                            <span className="font-medium text-sm">General referral</span>
                            <span className="text-xs text-muted-foreground">Patient can choose any matching provider/service.</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiver_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refer To</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {receiverTypeOptions.map((option) => (
                          <div key={option.value}>
                            <RadioGroupItem value={option.value} id={`receiver_${option.value}`} className="peer sr-only" />
                            <Label htmlFor={`receiver_${option.value}`} className={RADIO_TILE.replace('gap-2 ', '')}>
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isGeneral ? (
                <Card className="p-4 space-y-3">
                  <div className="text-sm font-medium">General referral details</div>
                  {(selectedReceiverType === 'doctor' || selectedReceiverType === 'clinic') ? (
                    <FormField
                      control={form.control}
                      name="target_specialty_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialty / Field</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Cardiology, Dentistry, Dermatology"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="target_service_label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service / Department</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., CBC, MRI, Medication pickup"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </Card>
              ) : (
                <FormField
                  control={form.control}
                  name="receiver_entity_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select {receiverTypeOptions.find((r) => r.value === selectedReceiverType)?.label}</FormLabel>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={`Search ${selectedReceiverType}s...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>

                        <div className="border rounded-md max-h-48 overflow-y-auto">
                          {loadingReceivers ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : receivers.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground text-sm">No {selectedReceiverType}s found</div>
                          ) : (
                            <div className="divide-y">
                              {receivers.map((receiver) => (
                                <div
                                  key={receiver.id}
                                  className={cn('p-3 cursor-pointer hover:bg-muted/50 transition-colors', field.value === receiver.id && 'bg-primary/10')}
                                  onClick={() => field.onChange(receiver.id)}
                                >
                                  <p className="font-medium text-sm">{getReceiverDisplayName(receiver)}</p>
                                  <p className="text-xs text-muted-foreground">{getReceiverSubtext(receiver)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="referral_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredReferralTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="routine" id="priority_routine" />
                          <Label htmlFor="priority_routine">Routine</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="urgent" id="priority_urgent" />
                          <Label htmlFor="priority_urgent" className="text-yellow-600">Urgent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="stat" id="priority_stat" />
                          <Label htmlFor="priority_stat" className="text-destructive">STAT</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Referral</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the reason for this referral..." className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinical_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinical Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional clinical information..."
                        className="min-h-[60px]"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valid Until</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            >
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferred_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Preferred Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            >
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Referral
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
