// Reusable Superbills manager: list, create, status updates, PDF download.
// Used by clinic admin, doctor dashboards, and patient billing surfaces.
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Download, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import {
  useSuperbills,
  useCreateSuperbill,
  updateSuperbillStatus,
  deleteSuperbill,
  type Superbill,
  type SuperbillStatus,
} from '@/hooks/useSuperbills';
import { downloadSuperbillPdf } from '@/lib/api/superbill-api';
import {
  useRecordedPayments,
  buildSuperbillFromPayments,
  type RecordedPayment,
  type SuperbillPrefill,
} from '@/hooks/useRecordedPayments';

export interface PatientOption { id: string; name: string }

interface Props {
  practiceId?: string | null;
  doctorId?: string | null;
  patientId?: string | null;
  patients?: PatientOption[];          // for selector in clinic/doctor mode
  defaultDoctorId?: string | null;
  allowCreate?: boolean;
  title?: string;
}

const STATUS_COLOR: Record<SuperbillStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  issued: 'bg-blue-100 text-blue-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
};

export function SuperbillsManager({
  practiceId, doctorId, patientId, patients = [],
  defaultDoctorId = null, allowCreate = true, title = 'Superbills',
}: Props) {
  const { superbills, loading, reload, stats } = useSuperbills({ practiceId, doctorId, patientId });
  const { create, submitting } = useCreateSuperbill();
  const { formatCents: money } = useCurrency();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'payments' | 'manual'>('payments');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [prefill, setPrefill] = useState<SuperbillPrefill | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const { payments: recordedPayments, loading: paymentsLoading } = useRecordedPayments({
    practiceId,
    doctorId: defaultDoctorId || doctorId,
    patientId,
  });
  const [form, setForm] = useState({
    patient: '',
    serviceDate: format(new Date(), 'yyyy-MM-dd'),
    dxCode: '',
    dxDesc: '',
    cptCode: '',
    cptDesc: '',
    cptUnits: '1',
    cptFee: '',
    notes: '',
  });

  const totalCharged = useMemo(() => money(stats.totalCents), [stats.totalCents, money]);

  const patientLabel = (p: RecordedPayment) =>
    p.patient_name || patients.find(x => x.id === p.patient_id)?.name || 'Patient';

  const togglePayment = async (id: string) => {
    const next = selectedPaymentIds.includes(id)
      ? selectedPaymentIds.filter(x => x !== id)
      : [...selectedPaymentIds, id];
    setSelectedPaymentIds(next);
    const rows = recordedPayments.filter(p => next.includes(p.id));
    if (!rows.length) { setPrefill(null); return; }
    setPrefilling(true);
    try {
      setPrefill(await buildSuperbillFromPayments(rows));
    } finally {
      setPrefilling(false);
    }
  };

  const resetDialog = () => {
    setSelectedPaymentIds([]);
    setPrefill(null);
    setForm({ patient: '', serviceDate: format(new Date(), 'yyyy-MM-dd'), dxCode: '', dxDesc: '', cptCode: '', cptDesc: '', cptUnits: '1', cptFee: '', notes: '' });
  };

  const handleCreateFromPayments = async () => {
    if (!prefill) { toast.error('Select at least one recorded payment'); return; }
    const firstPayment = recordedPayments.find(p => p.id === selectedPaymentIds[0]);
    const res = await create({
      doctorId: firstPayment?.doctor_id || defaultDoctorId || doctorId || null,
      practiceId: practiceId ?? firstPayment?.practice_id ?? null,
      patientId: prefill.patientId,
      appointmentId: prefill.appointmentId,
      serviceDate: prefill.serviceDate,
      diagnosisCodes: prefill.diagnoses,
      lineItems: prefill.lineItems,
      notes: prefill.notes,
      currency: prefill.currency,
      status: 'issued',
    });
    if (res.success) { setOpen(false); resetDialog(); void reload(); }
  };

  const handleCreate = async () => {
    const selectedPatient = patients.find(p => p.name === form.patient || p.id === form.patient);
    const targetPatientId = patientId || selectedPatient?.id;
    if (!targetPatientId) { toast.error('Select a patient'); return; }
    if (!form.cptCode || !form.cptFee) { toast.error('Add at least one procedure code and fee'); return; }
    const res = await create({
      doctorId: defaultDoctorId || doctorId || null,
      practiceId: practiceId ?? null,
      patientId: targetPatientId,
      serviceDate: form.serviceDate,
      diagnosisCodes: form.dxCode ? [{ code: form.dxCode, description: form.dxDesc }] : [],
      lineItems: [{
        code: form.cptCode,
        description: form.cptDesc || form.cptCode,
        units: Number(form.cptUnits) || 1,
        fee_cents: Math.round((Number(form.cptFee) || 0) * 100),
      }],
      notes: form.notes || null,
      status: 'issued',
    });
    if (res.success) {
      setOpen(false);
      resetDialog();
      void reload();
    }
  };

  const handleDownload = async (sb: Superbill) => {
    try { await downloadSuperbillPdf(sb.id, sb.superbill_number); }
    catch (e: any) { toast.error(e.message || 'Failed to download'); }
  };

  const handleStatus = async (sb: Superbill, status: SuperbillStatus) => {
    try { await updateSuperbillStatus(sb.id, status); toast.success('Updated'); void reload(); }
    catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const handleDelete = async (sb: Superbill) => {
    if (!confirm('Delete this superbill?')) return;
    try { await deleteSuperbill(sb.id); toast.success('Deleted'); void reload(); }
    catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Generated</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Submitted</p><p className="text-xl font-bold text-yellow-600">{stats.submitted}</p></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Reimbursed</p><p className="text-xl font-bold text-green-600">{stats.paid}</p></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Charged</p><p className="text-xl font-bold">{totalCharged}</p></CardContent></Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            {allowCreate && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Generate Superbill
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mx-auto animate-spin" /></div>
          ) : superbills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No superbills yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Number</th>
                    <th className="pb-2 font-medium text-muted-foreground">Service Date</th>
                    <th className="pb-2 font-medium text-muted-foreground">Total</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {superbills.map(sb => (
                    <tr key={sb.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 font-medium">{sb.superbill_number}</td>
                      <td className="py-2.5">{sb.service_date}</td>
                      <td className="py-2.5">{money(sb.total_amount_cents || 0)}</td>
                      <td className="py-2.5"><Badge className={STATUS_COLOR[sb.status]}>{sb.status}</Badge></td>
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7" onClick={() => handleDownload(sb)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {allowCreate && sb.status !== 'paid' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(sb, 'paid')}>Mark Paid</Button>
                          )}
                          {allowCreate && sb.status !== 'submitted' && sb.status !== 'paid' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(sb, 'submitted')}>Submit</Button>
                          )}
                          {allowCreate && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(sb)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Superbill</DialogTitle></DialogHeader>

          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'payments' ? 'default' : 'outline'} onClick={() => setMode('payments')}>
              From recorded payment
            </Button>
            <Button size="sm" variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')}>
              Enter manually
            </Button>
          </div>

          {mode === 'payments' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pick one or more recorded payments — patient, date, procedures and diagnoses are pulled in automatically.
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {paymentsLoading ? (
                  <div className="py-8 text-center"><Loader2 className="h-5 w-5 mx-auto animate-spin" /></div>
                ) : recordedPayments.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No recorded payments found.</div>
                ) : recordedPayments.map(p => {
                  const checked = selectedPaymentIds.includes(p.id);
                  return (
                    <label key={p.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${checked ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                      <input type="checkbox" checked={checked} onChange={() => void togglePayment(p.id)} className="h-4 w-4" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{patientLabel(p)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(p.paid_at || p.created_at).toLocaleDateString()}
                          {p.payment_method ? ` · ${p.payment_method}` : ''}
                          {p.appointment_id ? ' · linked visit' : ' · no visit linked'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{money(Math.round(Number(p.amount || 0) * 100))}</span>
                    </label>
                  );
                })}
              </div>

              {prefilling ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Pulling visit details…</div>
              ) : prefill ? (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">Superbill preview</p>
                  <p className="text-xs text-muted-foreground">Service date: {prefill.serviceDate}</p>
                  {prefill.diagnoses.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Diagnoses: {prefill.diagnoses.map(d => [d.code, d.description].filter(Boolean).join(' — ')).join('; ')}
                    </p>
                  )}
                  <div className="space-y-1">
                    {prefill.lineItems.map((li, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="truncate">{li.code} · {li.description}</span>
                        <span className="font-medium shrink-0">{money(li.fee_cents * (li.units || 1))}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                    <span>Total</span>
                    <span>{money(prefill.lineItems.reduce((s, li) => s + li.fee_cents * (li.units || 1), 0))}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!patientId && (
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground">Patient *</label>
                <Input list="sb-patients" value={form.patient} onChange={e => setForm(p => ({ ...p, patient: e.target.value }))} placeholder="Select patient…" />
                <datalist id="sb-patients">{patients.map(p => <option key={p.id} value={p.name} />)}</datalist>
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground">Service Date *</label>
              <Input type="date" value={form.serviceDate} onChange={e => setForm(p => ({ ...p, serviceDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">ICD-10 Diagnosis Code</label>
              <Input value={form.dxCode} onChange={e => setForm(p => ({ ...p, dxCode: e.target.value }))} placeholder="e.g. K02.9" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">Diagnosis Description</label>
              <Input value={form.dxDesc} onChange={e => setForm(p => ({ ...p, dxDesc: e.target.value }))} placeholder="Dental caries, unspecified" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">CPT/HCPCS Code *</label>
              <Input value={form.cptCode} onChange={e => setForm(p => ({ ...p, cptCode: e.target.value }))} placeholder="e.g. 99213" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Procedure Description</label>
              <Input value={form.cptDesc} onChange={e => setForm(p => ({ ...p, cptDesc: e.target.value }))} placeholder="Office visit, est. patient" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Units</label>
              <Input type="number" min="1" value={form.cptUnits} onChange={e => setForm(p => ({ ...p, cptUnits: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Fee (per unit) *</label>
              <Input type="number" step="0.01" value={form.cptFee} onChange={e => setForm(p => ({ ...p, cptFee: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">Notes</label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={mode === 'payments' ? handleCreateFromPayments : handleCreate}
              disabled={submitting || (mode === 'payments' && !prefill)}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
