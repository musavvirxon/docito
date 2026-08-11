import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentFinanceData } from "@/hooks/useAppointmentFinance";

const money = (b: any): number =>
  b.amount_cents != null ? Number(b.amount_cents) / 100 : Number(b.amount) || 0;

/**
 * Aggregate billing data for a single doctor within a date range.
 * Shaped so it can be fed straight into <AppointmentFinancePanel overrideData={...} />.
 * Scoping is doctor_id based and additionally protected by RLS on the underlying tables.
 */
export function useDoctorBillingAggregate(
  doctorId?: string | null,
  from?: Date,
  to?: Date,
): Partial<AppointmentFinanceData> & { refresh: () => Promise<void>; nameMap: Record<string, string> } {
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});


  const fromIso = from?.toISOString();
  const toIso = to?.toISOString();

  const refresh = useCallback(async () => {
    if (!doctorId) {
      setBilling([]);
      setPayments([]);
      return;
    }
    setLoading(true);
    try {
      let billQ = supabase
        .from("billing_transactions")
        .select("*")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false })
        .limit(500);
      let payQ = supabase
        .from("payments")
        .select("*")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false })
        .limit(500);

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
        setNameMap(map);
      } else {
        setNameMap({});
      }
    } catch (e) {

      console.error("doctor billing aggregate failed", e);
    } finally {
      setLoading(false);
    }
  }, [doctorId, fromIso, toIso]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const charges = billing.filter(
    (b) => (b.transaction_type ?? "charge") !== "discount" && (b.transaction_type ?? "charge") !== "refund",
  );
  const discounts = billing.filter((b) => b.transaction_type === "discount");

  const totalBilled = charges.reduce((s, b) => s + money(b), 0);
  const totalDiscounts = discounts.reduce((s, b) => s + Math.abs(money(b)), 0);
  const totalPaid = payments
    .filter((p) => !["refunded", "failed"].includes(String(p.status || "").toLowerCase()))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return {
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
}
