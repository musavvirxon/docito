import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { validatePhone } from '@/lib/phone/phone';

function makeRxNumber() {
  return `RX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

type RxItemDraft = {
  medication_name: string;
  medication_code: string;
  dosage: string;
  frequency: string;
  quantity: number;
  unit: string;
  instructions: string;
  substitutions_allowed: boolean;
};

export function PharmacyManualPrescriptionDialog({
  open,
  onOpenChange,
  pharmacyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pharmacyId: string;
  onCreated?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');

  const [doctorId, setDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [refillsTotal, setRefillsTotal] = useState(0);

  const [items, setItems] = useState<RxItemDraft[]>([
    {
      medication_name: '',
      medication_code: '',
      dosage: 'as directed',
      frequency: 'as directed',
      quantity: 1,
      unit: 'box',
      instructions: '',
      substitutions_allowed: true,
    },
  ]);

  useEffect(() => {
    if (!open) return;

    setPatientId('');
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setDoctorId('');
    setNotes('');
    setRefillsTotal(0);
    setItems([
      {
        medication_name: '',
        medication_code: '',
        dosage: 'as directed',
        frequency: 'as directed',
        quantity: 1,
        unit: 'box',
        instructions: '',
        substitutions_allowed: true,
      },
    ]);
  }, [open]);

  const validate = () => {
    if (!pharmacyId) return 'Missing pharmacy';

    if (!patientId.trim() && !patientName.trim()) {
      return 'Enter Patient ID (registered) OR Patient Name (walk-in)';
    }

    // ✅ phone required
    const phoneCheck = validatePhone(patientPhone);
    if (!phoneCheck.ok) return phoneCheck.reason || 'Invalid phone';

    if (items.length === 0) return 'Add at least 1 medication';
    for (const it of items) {
      if (!it.medication_name.trim()) return 'Medication name is required';
      if (!it.dosage.trim()) return 'Dosage is required';
      if (!it.frequency.trim()) return 'Frequency is required';
      if (!it.quantity || it.quantity < 1) return 'Quantity must be >= 1';
    }
    return null;
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medication_name: '',
        medication_code: '',
        dosage: 'as directed',
        frequency: 'as directed',
        quantity: 1,
        unit: 'box',
        instructions: '',
        substitutions_allowed: true,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, patch: Partial<RxItemDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      const prescription_number = makeRxNumber();
      const phone = validatePhone(patientPhone).normalized;

      const rxPayload: any = {
        prescription_number,
        pharmacy_id: pharmacyId,
        status: 'pending',
        notes: notes?.trim() || null,
        refills_total: refillsTotal,
        refills_remaining: refillsTotal,

        doctor_id: doctorId.trim() ? doctorId.trim() : null,
        patient_id: patientId.trim() ? patientId.trim() : null,

        patient_name: patientName.trim() || null,
        patient_phone: phone,
        patient_email: patientEmail.trim() || null,
      };

      const { data: createdRx, error: rxErr } = await supabase
        .from('prescriptions')
        .insert(rxPayload)
        .select()
        .single();

      if (rxErr) throw rxErr;

      const itemsPayload: any[] = items.map((it) => ({
        prescription_id: createdRx.id,
        medication_name: it.medication_name.trim(),
        medication_code: it.medication_code.trim() || null,
        dosage: it.dosage.trim(),
        frequency: it.frequency.trim(),
        quantity: Number(it.quantity),
        unit: it.unit.trim() || null,
        instructions: it.instructions.trim() || null,
        substitutions_allowed: !!it.substitutions_allowed,
      }));

      const { error: itemsErr } = await supabase.from('prescription_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      toast.success('Manual prescription created');
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Manual Prescription</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="text-sm font-semibold">Patient (Registered or Walk-in)</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Registered Patient ID (optional)</Label>
                <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Registered patient user_id" />
              </div>

              <div className="space-y-1">
                <Label>Walk-in Name (optional)</Label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Walk-in full name" />
              </div>

              {/* ✅ required phone */}
              <PhoneInput value={patientPhone} onChange={setPatientPhone} />

              <div className="space-y-1">
                <Label>Email (optional)</Label>
                <Input value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="email@example.com" />
              </div>
            </div>
          </div>

          {/* Doctor / Notes */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Doctor ID (optional)</Label>
                <Input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="doctor_id (optional)" />
              </div>

              <div className="space-y-1">
                <Label>Refills total</Label>
                <Input type="number" min={0} value={refillsTotal} onChange={(e) => setRefillsTotal(Number(e.target.value || 0))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Diagnosis, instructions, etc." />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Medications</div>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add medication
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <Card key={idx} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">Item #{idx + 1}</div>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Medication name *</Label>
                      <Input value={it.medication_name} onChange={(e) => updateItem(idx, { medication_name: e.target.value })} placeholder="Amoxicillin" />
                    </div>
                    <div className="space-y-1">
                      <Label>Medication code (optional)</Label>
                      <Input value={it.medication_code} onChange={(e) => updateItem(idx, { medication_code: e.target.value })} placeholder="CODE123" />
                    </div>

                    <div className="space-y-1">
                      <Label>Dosage *</Label>
                      <Input value={it.dosage} onChange={(e) => updateItem(idx, { dosage: e.target.value })} placeholder="500mg" />
                    </div>
                    <div className="space-y-1">
                      <Label>Frequency *</Label>
                      <Input value={it.frequency} onChange={(e) => updateItem(idx, { frequency: e.target.value })} placeholder="2x daily" />
                    </div>

                    <div className="space-y-1">
                      <Label>Quantity *</Label>
                      <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value || 1) })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Unit</Label>
                      <Input value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} placeholder="tabs/box/ml" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Instructions (optional)</Label>
                    <Textarea value={it.instructions} onChange={(e) => updateItem(idx, { instructions: e.target.value })} rows={2} placeholder="Take after meals..." />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox checked={it.substitutions_allowed} onCheckedChange={(v) => updateItem(idx, { substitutions_allowed: Boolean(v) })} />
                    <span className="text-sm">Allow generic substitution</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Prescription'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
