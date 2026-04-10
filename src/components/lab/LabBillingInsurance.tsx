// File: src/components/lab/LabBillingInsurance.tsx

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreditCard, Shield, RefreshCw } from 'lucide-react';

interface Props {
  labCenterId: string;
}

type BillingTx = {
  id: string;
  created_at: string;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  transaction_type: string | null;
  metadata?: Record<string, any> | null;
  description: string | null;
};

type InsuranceOrder = {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  payment_status: string | null;
  patient_id: string | null;
  facility_patient_id: string | null;
  patient_name: string;
  insurance_provider: string;
  member_id: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type FacilityPatientRow = { id: string; full_name: string; phone: string; email: string | null };

type FacilityBillingRes = {
  ok: boolean;
  error?: string;
  currency?: string;
  transactions?: Array<{
    id: string;
    created_at: string;
    amount_cents: number | null;
    currency: string | null;
    status: string | null;
    transaction_type: string | null;
    metadata?: Record<string, any> | null;
  }>;
};

function asName(p?: ProfileRow | null) {
  if (!p) return '';
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '';
}

function money(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '$0.00';
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyFromCents(cents: number) {
  const v = Number(cents);
  if (!Number.isFinite(v)) return '$0.00';
  return `$${(v / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(status: string | null | undefined) {
  const s = (status || 'pending').toLowerCase();
  switch (s) {
    case 'completed':
    case 'paid':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    case 'failed':
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
    case 'refunded':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Refunded</Badge>;
    case 'processing':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processing</Badge>;
    default:
      return <Badge variant="secondary">{status || '—'}</Badge>;
  }
}

export default function LabBillingInsurance({ labCenterId }: Props) {
  const { t } = useTranslation("labAdminDashboard");
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  const [currency, setCurrency] = useState('usd');
  const [transactions, setTransactions] = useState<BillingTx[]>([]);
  const [insuranceOrders, setInsuranceOrders] = useState<InsuranceOrder[]>([]);

  const [txSearch, setTxSearch] = useState('');
  const [insuranceSearch, setInsuranceSearch] = useState('');
  const [insuranceStatus, setInsuranceStatus] = useState('all');

  const fetchTransactions = async () => {
    if (!labCenterId) return;
    setTxLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<FacilityBillingRes>('facility-billing', {
        body: { entityType: 'lab', entityId: labCenterId, limit: 200 },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to load transactions');

      setCurrency((data.currency || 'usd').toLowerCase());

      const txs = (data.transactions || []).map((t) => {
        const meta: any = t.metadata || null;
        const description = typeof meta?.description === 'string' ? meta.description : null;
        return {
          id: t.id,
          created_at: t.created_at,
          amount_cents: t.amount_cents,
          currency: t.currency,
          status: t.status,
          transaction_type: t.transaction_type,
          metadata: t.metadata || null,
          description,
        } as BillingTx;
      });

      setTransactions(txs);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  };

  const fetchInsuranceOrders = async () => {
    if (!labCenterId) return;
    try {
      const { data: orders, error: oErr } = await supabase
        .from('test_orders')
        .select('id,order_number,created_at,total_amount,payment_status,patient_id,facility_patient_id')
        .eq('lab_center_id', labCenterId)
        .eq('insurance_covered', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (oErr) throw oErr;

      const orderRows = (orders || []) as any[];
      const patientIds = Array.from(new Set(orderRows.map((o) => o.patient_id).filter(Boolean)));
      const facilityIds = Array.from(new Set(orderRows.map((o) => o.facility_patient_id).filter(Boolean)));

      const [profilesRes, facilityRes, insuranceRes] = await Promise.all([
        patientIds.length
          ? supabase.from('profiles').select('user_id,full_name,first_name,last_name,phone,email').in('user_id', patientIds)
          : Promise.resolve({ data: [], error: null } as any),
        facilityIds.length
          ? (supabase.from as any)('facility_patients').select('id,full_name,phone,email').in('id', facilityIds)
          : Promise.resolve({ data: [], error: null } as any),
        patientIds.length
          ? supabase
              .from('patient_insurance')
              .select('patient_id,member_id,is_primary,provider:insurance_providers(provider_name)')
              .in('patient_id', patientIds)
              .order('is_primary', { ascending: false })
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (facilityRes.error) throw facilityRes.error;
      if (insuranceRes.error) throw insuranceRes.error;

      const profilesMap = new Map<string, ProfileRow>();
      for (const p of (profilesRes.data || []) as any[]) profilesMap.set(p.user_id, p);

      const facilityMap = new Map<string, FacilityPatientRow>();
      for (const fp of (facilityRes.data || []) as any[]) facilityMap.set(fp.id, fp);

      // pick primary insurance first, otherwise first row
      const insuranceByPatient = new Map<string, { provider_name: string; member_id: string }>();
      for (const row of (insuranceRes.data || []) as any[]) {
        const pid = row.patient_id;
        if (!pid) continue;
        if (insuranceByPatient.has(pid)) continue;
        insuranceByPatient.set(pid, {
          provider_name: row?.provider?.provider_name || '',
          member_id: row?.member_id || '',
        });
      }

      const formatted: InsuranceOrder[] = orderRows.map((o) => {
        const profile = o.patient_id ? profilesMap.get(o.patient_id) || null : null;
        const facility = o.facility_patient_id ? facilityMap.get(o.facility_patient_id) || null : null;
        const ins = o.patient_id ? insuranceByPatient.get(o.patient_id) : null;

        const patient_name = facility?.full_name || asName(profile) || (o.patient_id ? 'Patient' : 'Walk-in');

        const provider = ins?.provider_name || '—';
        const memberId = ins?.member_id || '—';

        return {
          id: o.id,
          order_number: o.order_number,
          created_at: o.created_at,
          total_amount: Number(o.total_amount || 0),
          payment_status: o.payment_status || 'pending',
          patient_id: o.patient_id,
          facility_patient_id: o.facility_patient_id,
          patient_name,
          insurance_provider: provider,
          member_id: memberId,
        };
      });

      setInsuranceOrders(formatted);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load insurance orders');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchInsuranceOrders()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId]);

  const txSummary = useMemo(() => {
    let grossCents = 0;
    let refundCents = 0;
    let completed = 0;

    for (const t of transactions) {
      const status = (t.status || '').toLowerCase();
      if (status !== 'completed') continue;

      const amt = Number(t.amount_cents || 0);
      const type = (t.transaction_type || '').toLowerCase();

      completed += 1;

      if (type.includes('refund') || amt < 0) {
        refundCents += Math.abs(amt);
      } else {
        grossCents += amt;
      }
    }

    return {
      grossCents,
      refundCents,
      netCents: grossCents - refundCents,
      completed,
    };
  }, [transactions]);

  const filteredTx = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const hay = [t.id, t.transaction_type || '', t.status || '', t.currency || '', t.description || ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, txSearch]);

  const filteredInsurance = useMemo(() => {
    const q = insuranceSearch.trim().toLowerCase();
    return insuranceOrders.filter((o) => {
      const matchesStatus = insuranceStatus === 'all' || (o.payment_status || '').toLowerCase() === insuranceStatus;
      const hay = [o.order_number, o.patient_name, o.insurance_provider, o.member_id].join(' ').toLowerCase();
      return matchesStatus && (!q || hay.includes(q));
    });
  }, [insuranceOrders, insuranceSearch, insuranceStatus]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            {t("dashboard.billing.title")}
          </h2>
          <p className="text-muted-foreground">{t("dashboard.billing.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={txLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${txLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.billing.grossRevenue")}</p>
                <p className="text-3xl font-bold">{moneyFromCents(txSummary.grossCents)}</p>
                <p className="text-xs text-muted-foreground mt-1">{currency.toUpperCase()}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.billing.refunds")}</p>
                <p className="text-3xl font-bold">{moneyFromCents(txSummary.refundCents)}</p>
                <p className="text-xs text-muted-foreground mt-1">{currency.toUpperCase()}</p>
              </div>
              <div className="p-3 bg-gray-500/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.billing.netRevenue")}</p>
                <p className="text-3xl font-bold">{moneyFromCents(txSummary.netCents)}</p>
                <p className="text-xs text-muted-foreground mt-1">{txSummary.completed} completed transactions</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions">{t("dashboard.billing.tabs.transactions")}</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>Entity-scoped billing transactions from Supabase.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input value={txSearch} onChange={(e) => setTxSearch(e.target.value)} placeholder="Search by status, type, description..." />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t("dashboard.billing.table.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTx.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap">{t.created_at ? format(new Date(t.created_at), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{t.transaction_type || '—'}</TableCell>
                          <TableCell>{statusBadge(t.status)}</TableCell>
                          <TableCell className="max-w-[420px] truncate">{t.description || '—'}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {moneyFromCents(Number(t.amount_cents || 0))} {t.currency ? t.currency.toUpperCase() : currency.toUpperCase()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Insurance-covered Orders
              </CardTitle>
              <CardDescription>Orders marked as insurance_covered=true, enriched with patient insurance (when available).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <Input value={insuranceSearch} onChange={(e) => setInsuranceSearch(e.target.value)} placeholder="Search by patient, provider, member ID..." />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={insuranceStatus} onValueChange={setInsuranceStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Member ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInsurance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No insurance orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInsurance.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="whitespace-nowrap">{o.created_at ? format(new Date(o.created_at), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                          <TableCell className="font-medium">{o.patient_name}</TableCell>
                          <TableCell>{o.insurance_provider}</TableCell>
                          <TableCell className="font-mono text-xs">{o.member_id}</TableCell>
                          <TableCell>{statusBadge(o.payment_status)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{money(o.total_amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
