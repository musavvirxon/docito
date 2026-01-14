import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { validatePhone } from '@/lib/phone/phone';
import { logSession } from '@/lib/debug/authDebug';

function makeImagingOrderNumber() {
  return `IMG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function ImagingManualOrderDialog({
  open,
  onOpenChange,
  imagingCenterId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  imagingCenterId: string;
  onCreated?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  // ✅ WALK-IN ONLY (manual booking)
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');

  const [studyType, setStudyType] = useState<'xray' | 'ct' | 'mri' | 'ultrasound' | 'mammography' | 'other'>('xray');
  const [studyName, setStudyName] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setStudyType('xray');
    setStudyName('');
    setClinicalNotes('');
  }, [open]);

  const validate = () => {
    if (!imagingCenterId) return 'Missing imaging center';

    // ✅ walk-in only
    if (!patientName.trim()) return 'Walk-in patient name is required';

    // ✅ phone required
    const phoneCheck = validatePhone(patientPhone);
    if (!phoneCheck.ok) return phoneCheck.reason || 'Invalid phone';

    if (!studyName.trim()) return 'Study name is required (e.g. Chest X-Ray)';
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      await logSession('IMAGING_MANUAL_ORDER_CREATE');

      const order_number = makeImagingOrderNumber();
      const phone = validatePhone(patientPhone).normalized;

      const payload: any = {
        order_number,
        imaging_center_id: imagingCenterId,
        status: 'pending',
        study_type: studyType,
        study_name: studyName.trim(),
        clinical_notes: clinicalNotes.trim() || null,

        // ✅ walk-in only
        patient_id: null,
        patient_name: patientName.trim(),
        patient_phone: phone,
        patient_email: patientEmail.trim() || null,
      };

      console.log('[IMAGING_MANUAL] clinic_imaging_orders payload:', payload);

      const { error } = await supabase.from('clinic_imaging_orders').insert(payload);
      if (error) throw error;

      toast.success('Manual imaging order created');
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to create imaging order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Manual Imaging Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3 border rounded-lg p-4">
            <div className="text-sm font-semibold">Patient (Walk-in only)</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Walk-in Name *</Label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full name" />
              </div>

              <PhoneInput value={patientPhone} onChange={setPatientPhone} />

              <div className="space-y-1 md:col-span-2">
                <Label>Email (optional)</Label>
                <Input value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="email@example.com" />
              </div>
            </div>
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Study type</Label>
                <Select value={studyType} onValueChange={(v) => setStudyType(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Study type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xray">X-Ray</SelectItem>
                    <SelectItem value="ct">CT</SelectItem>
                    <SelectItem value="mri">MRI</SelectItem>
                    <SelectItem value="ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="mammography">Mammography</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Study name *</Label>
                <Input value={studyName} onChange={(e) => setStudyName(e.target.value)} placeholder="Chest X-Ray, Brain MRI..." />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Clinical notes (optional)</Label>
              <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={3} placeholder="Symptoms, suspected diagnosis, instructions..." />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Imaging Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
