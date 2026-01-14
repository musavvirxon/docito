import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TestCatalogItem = {
  id: string;
  name: string;
  test_code: string;
  category: string;
  price: number | null;
  requires_fasting: boolean | null;
  sample_type: string | null;
  turnaround_hours: number | null;
  lab_center_id: string | null;
  visibility: 'private' | 'public';
  is_active: boolean | null;
};

interface LabManualTestOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labCenterId: string;
  onSubmit: (payload: {
    patient_id: string;
    clinical_notes: string;
    priority: string;
    selectedTests: string[];
  }) => Promise<void>;
}

const PRIORITIES = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'stat', label: 'STAT' },
];

export function LabManualTestOrderDialog({
  open,
  onOpenChange,
  labCenterId,
  onSubmit,
}: LabManualTestOrderDialogProps) {
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalog, setCatalog] = useState<TestCatalogItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [patientId, setPatientId] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [priority, setPriority] = useState('routine');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    if (!open) {
      setSelected({});
      setPatientId('');
      setClinicalNotes('');
      setSearch('');
      setCategory('all');
      setPriority('routine');
      return;
    }

    const run = async () => {
      setLoadingCatalog(true);

      const { data, error } = await supabase
        .from('test_catalog')
        .select(
          'id,name,test_code,category,price,requires_fasting,sample_type,turnaround_hours,lab_center_id,visibility,is_active'
        )
        .eq('is_active', true)
        .or(`lab_center_id.eq.${labCenterId},visibility.eq.public`)
        .order('name');

      setLoadingCatalog(false);

      if (error) {
        console.error(error);
        toast.error('Failed to load test catalog');
        return;
      }

      setCatalog((data || []) as any);
    };

    run();
  }, [open, labCenterId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((t) => t.category && set.add(t.category));
    return ['all', ...Array.from(set).sort()];
  }, [catalog]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return catalog.filter((t) => {
      const matchesSearch =
        !s ||
        t.name.toLowerCase().includes(s) ||
        (t.test_code || '').toLowerCase().includes(s);
      const matchesCat = category === 'all' || t.category === category;
      return matchesSearch && matchesCat;
    });
  }, [catalog, search, category]);

  const selectedTests = useMemo(() => {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const submit = async () => {
    if (!patientId.trim()) {
      toast.error('Patient ID is required');
      return;
    }
    if (selectedTests.length === 0) {
      toast.error('Select at least one test');
      return;
    }

    await onSubmit({
      patient_id: patientId.trim(),
      clinical_notes: clinicalNotes,
      priority,
      selectedTests,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Manual Lab Order</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left: Form */}
          <div className="space-y-4 md:col-span-1">
            <div className="space-y-2">
              <Label>Patient ID</Label>
              <Input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter patient user_id"
              />
              <div className="text-xs text-muted-foreground">
                This must match the patient’s <span className="font-mono">profiles.user_id</span>.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <Textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={6}
              />
            </div>

            <Button onClick={submit} className="w-full" disabled={loadingCatalog}>
              Create Order
            </Button>
          </div>

          {/* Right: Catalog */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code..."
              />

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="md:w-56">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === 'all' ? 'All Categories' : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md max-h-[420px] overflow-y-auto">
              {loadingCatalog ? (
                <div className="p-4 text-sm text-muted-foreground">Loading tests...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No tests found</div>
              ) : (
                <div className="divide-y">
                  {filtered.map((t) => {
                    const isMine = t.lab_center_id === labCenterId;
                    return (
                      <label
                        key={t.id}
                        className="flex items-start gap-3 p-3 hover:bg-muted/30 cursor-pointer"
                      >
                        <Checkbox
                          checked={!!selected[t.id]}
                          onCheckedChange={() => toggle(t.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{t.test_code}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                            <span>{t.category}</span>
                            {t.sample_type ? <span>Sample: {t.sample_type}</span> : null}
                            {t.turnaround_hours != null ? <span>TAT: {t.turnaround_hours}h</span> : null}
                            {t.requires_fasting ? <span className="text-orange-600">Fasting</span> : null}
                            {t.price != null ? <span>Price: {t.price}</span> : null}
                            {!isMine && t.visibility === 'public' ? (
                              <span className="text-blue-600">Public (other lab)</span>
                            ) : t.visibility === 'public' ? (
                              <span className="text-blue-600">Public</span>
                            ) : (
                              <span className="text-muted-foreground">Private</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedTests.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                Selected: <span className="font-medium">{selectedTests.length}</span> tests
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
