import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { validatePhone } from '@/lib/phone/phone';
import { logSession } from '@/lib/debug/authDebug';

type RxItemDraft = {
  medication_name: string;
  medication_code: string;
  dosage: string;
  frequency: string;
  quantity: number | string;
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

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');

  const [doctorId, setDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [refillsTotal, setRefillsTotal] = useState<number>(0);

  const [items, setItems] = useState<RxItemDraft[]>([
    {
      medication_name: '',
      medication_code: '',
      dosage: '',
      frequency: '',
      quantity: 1,
      unit: '',
      instructions: '',
      substitutions_allowed: true,
    },
  ]);

  useEffect(() => {
    if (!open) return;

    setLoading(false);
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
        dosage: '',
        frequency: '',
        quantity: 1,
        unit: '',
        instructions: '',
        substitutions_allowed: true,
      },
    ]);
  }, [open]);

  const validate = () => {
    if (!pharmacyId) return 'Missing pharmacy';
    if (!patientName.trim()) return 'Walk-in name is required';

    const phoneCheck = validatePhone(patientPhone);
    if (!phoneCheck.ok) return phoneCheck.reason || 'Invalid phone';

    if (!items.length) return 'Add at least one medication item';
    for (const it of items) {
      if (!it.medication_name.trim()) return 'Medication name is required';
      if (!it.dosage.trim()) return 'Dosage is required';
      if (!it.frequency.trim()) return 'Frequency is required';
      const q = Number(it.quantity);
      if (!Number.isFinite(q) || q <= 0) return 'Quantity must be > 0';
    }

    return null;
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medication_name: '',
        medication_code: '',
        dosage: '',
        frequency: '',
        quantity: 1,
        unit: '',
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

  const canSubmit = useMemo(() => !loading && !!pharmacyId, [loading, pharmacyId]);

  const handleCreate = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      await logSession('PHARMACY_MANUAL_PRESCRIPTION_CREATE');

      const phone = validatePhone(patientPhone).normalized;
      const email = patientEmail.trim().toLowerCase() || null;

      const { data, error } = await supabase.functions.invoke('pharmacy-create-prescription', {
        body: {
          pharmacyId,
          patient: {
            patient_id: null,
            full_name: patientName.trim(),
            phone,
            email,
            date_of_birth: null,
          },
          doctor_id: doctorId.trim() ? doctorId.trim() : null,
          notes: notes?.trim() || null,
          refills_total: refillsTotal || 0,
          items: items.map((it) => ({
            medication_name: it.medication_name.trim(),
            medication_code: it.medication_code.trim() || null,
            dosage: it.dosage.trim(),
            frequency: it.frequency.trim(),
            quantity: Number(it.quantity),
            unit: it.unit.trim() || null,
            instructions: it.instructions.trim() || null,
            substitutions_allowed: !!it.substitutions_allowed,
          })),
        },
      });

      if (error) {
        const ctx = (error as any)?.context ? JSON.stringify((error as any).context) : '';
        throw new Error(`${error.message}${ctx ? ` | ${ctx}` : ''}`);
      }

      if (!data?.ok) {
        const meta = data?.meta ? ` | ${JSON.stringify(data.meta)}` : '';
        throw new Error(`${data?.error || 'Failed to create prescription'}${meta}`);
      }

      toast.success(`Manual prescription created (${data.prescriptionNumber || 'RX'})`);
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
          <DialogTitle>{t("pharmacyDashboard.manualPrescription.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3 border rounded-lg p-4">
            <div className="text-sm font-semibold">Patient (Walk-in)</div>

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
                <Label>Doctor ID (optional)</Label>
                <Input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="doctor UUID (optional)" />
              </div>

              <div className="space-y-1">
                <Label>Refills total</Label>
                <Input
                  type="number"
                  value={refillsTotal}
                  min={0}
                  onChange={(e) => setRefillsTotal(Math.max(0, Number(e.target.value || 0)))}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Medications</div>
              <Button variant="outline" onClick={addItem} type="button">
                Add item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Item #{idx + 1}</div>
                    {items.length > 1 && (
                      <Button variant="destructive" onClick={() => removeItem(idx)} type="button">
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Medication name *</Label>
                      <Input value={it.medication_name} onChange={(e) => updateItem(idx, { medication_name: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                      <Label>Medication code (optional)</Label>
                      <Input value={it.medication_code} onChange={(e) => updateItem(idx, { medication_code: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                      <Label>Dosage *</Label>
                      <Input value={it.dosage} onChange={(e) => updateItem(idx, { dosage: e.target.value })} placeholder="e.g. 500mg" />
                    </div>

                    <div className="space-y-1">
                      <Label>Frequency *</Label>
                      <Input
                        value={it.frequency}
                        onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                        placeholder="e.g. 2x/day"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Unit (optional)</Label>
                      <Input value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} placeholder="tablets, ml..." />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <Label>Instructions (optional)</Label>
                      <Input
                        value={it.instructions}
                        onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                        placeholder="Take after meals..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!canSubmit}>
              {loading ? 'Creating...' : 'Create Prescription'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
