import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { validatePhone } from '@/lib/phone/phone';
import { logSession } from '@/lib/debug/authDebug';

type TestCatalogRow = {
  id: string;
  name: string;
  test_code: string;
  category: string;
  price: number | null;
  requires_fasting: boolean | null;
  sample_type: string | null;
  turnaround_hours: number | null;

  // optional depending on schema version
  visibility?: 'private' | 'public' | null;
  is_global?: boolean | null;
  is_active?: boolean | null;
  lab_center_id?: string | null;
};

type PatientMatch = {
  user_id: string; // profiles.user_id
  full_name: string;
  phone: string | null;
  email: string;
};

function makeOrderNumber() {
  return `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * FIXED catalog visibility logic:
 * - Some rows are is_global=true but visibility='private' and lab_center_id=NULL.
 * - Previously, the "visibility" query succeeded (no error) but returned 0 rows, so we never fell back to is_global.
 * - Now we ALWAYS include public OR global OR lab-owned in ONE query:
 *   (lab_center_id = currentLab) OR (visibility = 'public') OR (is_global = true)
 */
export function LabManualTestOrderDialog({
  open,
  onOpenChange,
  labCenterId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  labCenterId: string;
  onCreated?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  // Patient inputs (no UUID typing)
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientName, setPatientName] = useState('');

  // Auto-detected registered patient (if exists)
  const [matchedPatient, setMatchedPatient] = useState<PatientMatch | null>(null);
  const [patientLookupLoading, setPatientLookupLoading] = useState(false);

  // Order fields
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Catalog
  const [catalog, setCatalog] = useState<TestCatalogRow[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  // Load catalog
  useEffect(() => {
    if (!open) return;

    // reset
    setLoading(false);
    setPatientPhone('');
    setPatientEmail('');
    setPatientName('');
    setMatchedPatient(null);
    setPatientLookupLoading(false);

    setPriority('routine');
    setClinicalNotes('');
    setSearch('');
    setCategory('all');
    setSelectedTests([]);
    setCatalog([]);

    const run = async () => {
      if (!labCenterId) return;

      // One query that works with BOTH schemas, because selecting a missing column will error:
      // We try a "full select" (includes visibility + is_global). If it errors, we retry with a minimal select.
      const tryFull = async () => {
        return await supabase
          .from('test_catalog')
          .select(
            'id,name,test_code,category,price,requires_fasting,sample_type,turnaround_hours,visibility,is_global,is_active,lab_center_id'
          )
          .eq('is_active', true)
          .or(`lab_center_id.eq.${labCenterId},visibility.eq.public,is_global.eq.true`)
          .order('name');
      };

      const tryMinimal = async () => {
        // For older schemas that may not have visibility/is_global
        return await supabase
          .from('test_catalog')
          .select('id,name,test_code,category,price,requires_fasting,sample_type,turnaround_hours,is_active,lab_center_id')
          .eq('is_active', true)
          .eq('lab_center_id', labCenterId)
          .order('name');
      };

      let data: any = null;
      let error: any = null;

      ({ data, error } = await tryFull());
      if (error) {
        ({ data, error } = await tryMinimal());
      }

      if (error) {
        console.error(error);
        toast.error(error.message || 'Failed to load test catalog');
        return;
      }

      setCatalog((data || []) as any);
    };

    run();
  }, [open, labCenterId]);

  // Patient lookup by phone/email (auto-detect signed up)
  const lookupPatient = async () => {
    const email = patientEmail.trim().toLowerCase();
    const phoneCheck = validatePhone(patientPhone);
    const hasPhone = phoneCheck.ok && !!phoneCheck.normalized;
    const hasEmail = !!email;

    if (!hasPhone && !hasEmail) {
      setMatchedPatient(null);
      return;
    }

    setPatientLookupLoading(true);
    try {
      let q = supabase
        .from('profiles')
        .select('user_id,full_name,phone,email,role')
        .eq('role', 'patient')
        .limit(1);

      if (hasPhone && hasEmail) {
        q = q.or(`phone.eq.${phoneCheck.normalized},email.eq.${email}`);
      } else if (hasPhone) {
        q = q.eq('phone', phoneCheck.normalized);
      } else {
        q = q.eq('email', email);
      }

      const { data, error } = await q;
      if (error) throw error;

      const row = (data || [])[0] as any;
      if (row?.user_id) {
        setMatchedPatient({
          user_id: row.user_id,
          full_name: row.full_name,
          phone: row.phone,
          email: row.email,
        });

        if (!patientName.trim()) setPatientName(row.full_name || '');
      } else {
        setMatchedPatient(null);
      }
    } catch (e: any) {
      console.error(e);
      setMatchedPatient(null);
    } finally {
      setPatientLookupLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      lookupPatient();
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientPhone, patientEmail, open]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(catalog.map((c) => c.category))).filter(Boolean)],
    [catalog]
  );

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((t) => {
      const matchesSearch =
        !term ||
        t.name.toLowerCase().includes(term) ||
        (t.test_code || '').toLowerCase().includes(term);

      const matchesCategory = category === 'all' || t.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [catalog, search, category]);

  const totalPrice = useMemo(() => {
    const map = new Map(catalog.map((t) => [t.id, t]));
    return selectedTests.reduce((sum, id) => sum + (map.get(id)?.price || 0), 0);
  }, [selectedTests, catalog]);

  const toggleTest = (id: string) => {
    setSelectedTests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const validate = () => {
    if (!labCenterId) return 'Missing lab center';
    if (selectedTests.length === 0) return 'Select at least 1 test';

    const phoneCheck = validatePhone(patientPhone);
    if (!phoneCheck.ok) return phoneCheck.reason || 'Invalid phone';

    if (!matchedPatient && !patientName.trim()) return 'Patient name is required for walk-in';

    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      await logSession('LAB_MANUAL_ORDER_CREATE');

      const order_number = makeOrderNumber();
      const phone = validatePhone(patientPhone).normalized;
      const email = patientEmail.trim().toLowerCase() || null;

      const external_patient_ref = phone || email || null;

      const orderPayload: any = {
        order_number,
        lab_center_id: labCenterId,
        status: 'pending',
        priority,
        clinical_notes: clinicalNotes?.trim() || null,
        total_amount: totalPrice || null,

        patient_id: matchedPatient?.user_id || null,
        external_patient_ref,

        patient_name: patientName.trim() || matchedPatient?.full_name || null,
        patient_phone: phone,
        patient_email: email,

        patient_snapshot_full_name: patientName.trim() || matchedPatient?.full_name || null,
        patient_snapshot_phone: phone,
        patient_snapshot_email: email,
      };

      const { data: createdOrder, error: orderErr } = await supabase
        .from('test_orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderErr) throw orderErr;

      const itemsPayload: any[] = selectedTests.map((testId) => ({
        test_order_id: createdOrder.id,
        test_id: testId,
      }));

      const { error: itemsErr } = await supabase.from('test_order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      toast.success('Manual lab order created');
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const patientBadge = useMemo(() => {
    if (patientLookupLoading) return <Badge variant="secondary">Checking…</Badge>;
    if (matchedPatient) return <Badge variant="secondary">Registered patient</Badge>;
    if (validatePhone(patientPhone).ok) return <Badge variant="outline">Walk-in</Badge>;
    return null;
  }, [matchedPatient, patientLookupLoading, patientPhone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Manual Lab Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Patient</div>
              {patientBadge}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone *</Label>
                <PhoneInput value={patientPhone} onChange={setPatientPhone} />
              </div>

              <div className="space-y-1">
                <Label>Email (optional)</Label>
                <Input
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label>Name {matchedPatient ? '(auto-filled)' : '*'}</Label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full name" />
              </div>
            </div>
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Total</Label>
                <Input value={`$${totalPrice}`} readOnly />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Clinical Notes (optional)</Label>
              <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={3} />
            </div>
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Label>Search tests</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="CBC, glucose..." />
              </div>
              <div className="w-full md:w-64">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === 'all' ? 'All categories' : c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="h-[280px] border rounded-md">
              <div className="divide-y">
                {filteredCatalog.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer flex items-start gap-3"
                    onClick={() => toggleTest(t.id)}
                  >
                    <Checkbox checked={selectedTests.includes(t.id)} onCheckedChange={() => toggleTest(t.id)} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium">{t.name}</div>
                        <Badge variant="outline" className="text-xs font-mono">
                          {t.test_code}
                        </Badge>
                        {t.is_global ? (
                          <Badge variant="secondary" className="text-xs">
                            Global
                          </Badge>
                        ) : null}
                        {t.visibility === 'public' ? (
                          <Badge variant="secondary" className="text-xs">
                            Public
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.category}
                        {t.sample_type ? ` • ${t.sample_type}` : ''}
                        {t.turnaround_hours ? ` • ${t.turnaround_hours}h` : ''}
                      </div>
                    </div>
                    <div className="font-medium">{t.price ? `$${t.price}` : ''}</div>
                  </div>
                ))}
                {filteredCatalog.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No tests found.</div>
                ) : null}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
