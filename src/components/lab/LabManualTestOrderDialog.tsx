import { useEffect, useMemo, useState } from 'react';
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
};

function makeOrderNumber() {
  return `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

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

  // ✅ WALK-IN ONLY (manual booking)
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');

  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [clinicalNotes, setClinicalNotes] = useState('');

  const [catalog, setCatalog] = useState<TestCatalogRow[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    // reset
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setPriority('routine');
    setClinicalNotes('');
    setSearch('');
    setCategory('all');
    setSelectedTests([]);

    const run = async () => {
      if (!labCenterId) return;
      const { data, error } = await supabase
        .from('test_catalog')
        .select('id,name,test_code,category,price,requires_fasting,sample_type,turnaround_hours')
        .eq('lab_center_id', labCenterId)
        .order('name');

      if (error) {
        console.error(error);
        toast.error('Failed to load test catalog');
        return;
      }
      setCatalog((data || []) as any);
    };

    run();
  }, [open, labCenterId]);

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

    // ✅ manual = walk-in only
    if (!patientName.trim()) return 'Walk-in patient name is required';

    // ✅ phone required for ALL manual lab orders
    const phoneCheck = validatePhone(patientPhone);
    if (!phoneCheck.ok) return phoneCheck.reason || 'Invalid phone';

    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      // ✅ DEBUG (shows anon vs authenticated in console)
      await logSession('LAB_MANUAL_ORDER_CREATE');

      const order_number = makeOrderNumber();
      const phone = validatePhone(patientPhone).normalized;

      const orderPayload: any = {
        order_number,
        lab_center_id: labCenterId, // if your column is lab_id, change to lab_id
        status: 'pending',
        priority,
        clinical_notes: clinicalNotes?.trim() || null,

        // ✅ walk-in only
        patient_id: null,
        patient_name: patientName.trim(),
        patient_phone: phone,
        patient_email: patientEmail.trim() || null,
      };

      console.log('[LAB_MANUAL] test_orders payload:', orderPayload);

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

      console.log('[LAB_MANUAL] test_order_items payload:', itemsPayload);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Manual Lab Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="text-sm font-semibold">Patient (Walk-in only)</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Walk-in Name *</Label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Full name"
                />
              </div>

              {/* ✅ Phone required */}
              <PhoneInput value={patientPhone} onChange={setPatientPhone} />

              <div className="space-y-1 md:col-span-2">
                <Label>Email (optional)</Label>
                <Input
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Order details */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
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
              <Textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={3}
                placeholder="Symptoms, diagnosis, instructions..."
              />
            </div>
          </div>

          {/* Tests */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Label>Search tests</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="CBC, glucose..." />
              </div>
              <div className="w-full md:w-64">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
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
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{t.name}</div>
                        <Badge variant="outline" className="text-xs font-mono">{t.test_code}</Badge>
                        {t.requires_fasting ? <Badge variant="secondary" className="text-xs">Fasting</Badge> : null}
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
                  <div className="p-6 text-center text-muted-foreground">No tests found</div>
                ) : null}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
