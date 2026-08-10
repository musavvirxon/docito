import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentFinanceData } from "@/hooks/useAppointmentFinance";

const money = (b: any): number =>
  b.amount_cents != null ? Number(b.amount_cents) / 100 : Number(b.amount) || 0;

export type PracticePatientBalanceRow = {
  key: string;
  patientId: string | null;
  patientName: string;
  doctorId: string | null;
  doctorName: string;
  billed: number;
  discounts: number;
  paid: number;
  outstanding: number;
  lastActivity: string | null;
  charges: any[];
  payments: any[];
};

/**
 * Aggregate billing data for an entire practice within a date range.
 * Shaped so the totals can be passed to <AppointmentFinancePanel overrideData={...} />,
 * plus a per-patient breakdown (billed / paid / owed / doctor / last activity).
 */
export function usePracticeBillingAggregate(
  practiceId?: string | null,
  from?: Date,
  to?: Date,
) {
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const fromIso = from?.toISOString();
  const toIso = to?.toISOString();

  const refresh = useCallback(async () => {
    if (!practiceId) {
      setBilling([]);
      setPayments([]);
      return;
    }
    setLoading(true);
    try {
      let billQ = supabase
        .from("billing_transactions")
        .select("*")
        .eq("practice_id", practiceId)
        .order("created_at", { ascending: false })
        .limit(1000);
      let payQ = supabase
        .from("payments")
        .select("*")
        .eq("practice_id", practiceId)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (fromIso) {
        billQ = billQ.gte("created_at", fromIso);
        payQ = payQ.gte("created_at", fromIso);
      }
      if (toIso) {
        billQ = billQ.lte("created_at", toIso);
        payQ = payQ.lte("created_at", toIso);
      }

      const [billRes, payRes] = await Promise.all([billQ, payQ]);
      const bills = (billRes.data as any[]) || [];
      const pays = (payRes.data as any[]) || [];
      setBilling(bills);
      setPayments(pays);

      const ids = Array.from(
        new Set(
          [...bills, ...pays]
            .flatMap((r: any) => [r.patient_id, r.doctor_id])
            .filter(Boolean),
        ),
      ) as string[];

      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          if (p?.id) map[p.id] = p.full_name || "";
        });
        setNames(map);
      } else {
        setNames({});
      }
    } catch (e) {
      console.error("practice billing aggregate failed", e);
    } finally {
      setLoading(false);
    }
  }, [practiceId, fromIso, toIso]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const charges = billing.filter(
    (b) =>
      (b.transaction_type ?? "charge") !== "discount" &&
      (b.transaction_type ?? "charge") !== "refund" &&
      (b.transaction_type ?? "charge") !== "payment",
  );
  const discounts = billing.filter((b) => b.transaction_type === "discount");
  const ledgerPayments = billing.filter((b) => b.transaction_type === "payment");
  const realPayments = payments.filter(
    (p) => !["refunded", "failed"].includes(String(p.status || "").toLowerCase()),
  );

  const totalBilled = charges.reduce((s, b) => s + money(b), 0);
  const totalDiscounts = discounts.reduce((s, b) => s + Math.abs(money(b)), 0);
  const totalPaid =
    realPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0) +
    ledgerPayments.reduce((s, b) => s + Math.abs(money(b)), 0);

  const patientName = (row: any): string => {
    const meta = row?.metadata || row?.provider_data || {};
    return (
      (row.patient_id && names[row.patient_id]) ||
      meta.patient_name ||
      meta.customer_name ||
      ""
    );
  };

  const rows: PracticePatientBalanceRow[] = useMemo(() => {
    const map = new Map<string, PracticePatientBalanceRow>();

    const ensure = (row: any): PracticePatientBalanceRow => {
      const name = patientName(row);
      const key = row.patient_id || (name ? `name:${name.toLowerCase()}` : "unknown");
      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          patientId: row.patient_id || null,
          patientName: name,
          doctorId: row.doctor_id || null,
          doctorName: (row.doctor_id && names[row.doctor_id]) || "",
          billed: 0,
          discounts: 0,
          paid: 0,
          outstanding: 0,
          lastActivity: null,
          charges: [],
          payments: [],
        };
        map.set(key, entry);
      }
      if (!entry.doctorId && row.doctor_id) {
        entry.doctorId = row.doctor_id;
        entry.doctorName = names[row.doctor_id] || "";
      }
      const at = row.paid_at || row.created_at || null;
      if (at && (!entry.lastActivity || at > entry.lastActivity)) entry.lastActivity = at;
      return entry;
    };

    charges.forEach((b) => {
      const e = ensure(b);
      e.billed += money(b);
      e.charges.push(b);
    });
    discounts.forEach((b) => {
      const e = ensure(b);
      e.discounts += Math.abs(money(b));
      e.charges.push(b);
    });
    ledgerPayments.forEach((b) => {
      const e = ensure(b);
      e.paid += Math.abs(money(b));
      e.payments.push({ ...b, amount: Math.abs(money(b)) });
    });
    realPayments.forEach((p) => {
      const e = ensure(p);
      e.paid += Number(p.amount) || 0;
      e.payments.push(p);
    });

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        outstanding: Math.max(0, r.billed - r.discounts - r.paid),
      }))
      .sort((a, b) => String(b.lastActivity || "").localeCompare(String(a.lastActivity || "")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing, payments, names]);

  const doctors = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      if (r.doctorId) m.set(r.doctorId, r.doctorName || r.doctorId.slice(0, 8));
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  const financeData: Partial<AppointmentFinanceData> & { refresh: () => Promise<void> } = {
    loading,
    billing: billing as any,
    payments: payments as any,
    insurance: null,
    totalBilled,
    totalPaid,
    totalDiscounts,
    outstanding: Math.max(0, totalBilled - totalDiscounts - totalPaid),
    priorBalance: 0,
    currency: (billing[0]?.currency as string) || "uzs",
    refresh,
  };

  return { loading, rows, doctors, financeData, refresh };
}
