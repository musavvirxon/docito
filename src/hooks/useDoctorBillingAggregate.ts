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
        const patientIds = Array.from(new Set([...bills, ...pays].map((r: any) => r.patient_id).filter(Boolean))) as string[];
        const appointmentIds = Array.from(new Set([...bills, ...pays].map((r: any) => r.appointment_id).filter(Boolean))) as string[];
        const [{ data: patientProfiles }, { data: doctor }, { data: appointments }] = await Promise.all([
          patientIds.length
            ? supabase.from("profiles").select("id, user_id, full_name").in("user_id", patientIds)
            : Promise.resolve({ data: [] as any[] }),
          supabase.from("doctors").select("id, user_id").eq("id", doctorId).maybeSingle(),
          appointmentIds.length
            ? supabase.from("appointments").select("id, doctor_patient_id").in("id", appointmentIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const doctorUserId = (doctor as any)?.user_id as string | undefined;
        const manualPatientIds = (appointments || []).map((a: any) => a.doctor_patient_id).filter(Boolean) as string[];
        const [{ data: doctorProfiles }, { data: manualPatients }] = await Promise.all([
          doctorUserId
            ? supabase.from("profiles").select("user_id, full_name").eq("user_id", doctorUserId)
            : Promise.resolve({ data: [] as any[] }),
          manualPatientIds.length
            ? supabase.from("doctor_patients").select("id, full_name").in("id", manualPatientIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const map: Record<string, string> = {};
        (patientProfiles || []).forEach((p: any) => {
          if (p?.user_id) map[p.user_id] = p.full_name || "";
        });
        if (doctorId) map[doctorId] = (doctorProfiles || [])[0]?.full_name || "";
        (appointments || []).forEach((a: any) => {
          const manualPatient = (manualPatients || []).find((p: any) => p.id === a.doctor_patient_id);
          if (a?.id && manualPatient?.full_name) map[`appointment:${a.id}`] = manualPatient.full_name;
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
    (b) =>
      (b.transaction_type ?? "charge") !== "discount" &&
      (b.transaction_type ?? "charge") !== "refund" &&
      (b.transaction_type ?? "charge") !== "payment",
  );
  const discounts = billing.filter((b) => b.transaction_type === "discount");
  const ledgerPayments = billing.filter((b) => b.transaction_type === "payment");

  const totalBilled = charges.reduce((s, b) => s + money(b), 0);
  const totalDiscounts = discounts.reduce((s, b) => s + Math.abs(money(b)), 0);
  const totalPaid =
    payments
      .filter((p) => !["refunded", "failed"].includes(String(p.status || "").toLowerCase()))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0) +
    ledgerPayments.reduce((s, b) => s + Math.abs(money(b)), 0);

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
    nameMap,
  };

}
