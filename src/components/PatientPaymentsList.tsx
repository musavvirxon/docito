import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentRow {
  id: string;
  amount: number;
  status: string | null;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  appointment_id: string | null;
  doctor_id: string | null;
  patient_id: string | null;
}

interface Props {
  /** Patient auth user id (payments.patient_id) */
  patientUserId?: string | null;
  /** Optional: restrict to a specific doctor */
  doctorId?: string | null;
  /** Optional: restrict to a list of appointment ids (used when matching doctor_patient → appointments) */
  appointmentIds?: string[] | null;
  title?: string;
  emptyText?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

export const PatientPaymentsList = ({
  patientUserId,
  doctorId,
  appointmentIds,
  title = 'Payment history',
  emptyText = 'No payments recorded yet.',
}: Props) => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from('payments')
        .select('*')
        .order('paid_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (patientUserId) query = query.eq('patient_id', patientUserId);
      if (doctorId) query = query.eq('doctor_id', doctorId);
      if (appointmentIds && appointmentIds.length > 0)
        query = query.in('appointment_id', appointmentIds);

      const { data, error } = await query;
      if (!error) setRows((data || []) as PaymentRow[]);
      setLoading(false);
    };

    if (patientUserId || doctorId || (appointmentIds && appointmentIds.length)) {
      load();
    } else {
      setRows([]);
      setLoading(false);
    }
  }, [patientUserId, doctorId, JSON.stringify(appointmentIds || [])]);

  const total = rows
    .filter((r) => ['paid', 'completed', 'succeeded'].includes((r.status || '').toLowerCase()))
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" /> {title}
        </CardTitle>
        <Badge variant="outline">Total paid: {fmt(total)}</Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const date = r.paid_at || r.created_at;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.transaction_id || 'Payment'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {date ? new Date(date).toLocaleDateString() : ''}
                      {r.payment_method ? ` · ${r.payment_method}` : ''}
                      {r.notes ? ` · ${r.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">{fmt(Number(r.amount))}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {r.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientPaymentsList;
