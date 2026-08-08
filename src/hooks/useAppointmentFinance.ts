import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PaymentMethod = "cash" | "card" | "insurance" | "bank_transfer" | "other";

interface PaymentRow {
  id: string;
  amount: number;
  status: string | null;
  payment_method: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

interface BillingRow {
  id: string;
  amount: number;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  description: string | null;
  transaction_type: string | null;
  appointment_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface InsuranceRow {
  id: string;
  member_id: string | null;
  co_pay: number | null;
  is_primary: boolean | null;
  status: string | null;
}

export interface AppointmentFinanceData {
  loading: boolean;
  payments: PaymentRow[];
  billing: BillingRow[];
  insurance: InsuranceRow | null;
  totalBilled: number;
  totalPaid: number;
  totalDiscounts: number;
  outstanding: number;
  priorBalance: number;
  currency: string;
  refresh: () => Promise<void>;
  recordPayment: (input: { amount: number; method: PaymentMethod; notes?: string }) => Promise<void>;
  applyDiscount: (input: { amount: number; reason?: string }) => Promise<void>;
  addCharge: (input: {
    description: string;
    amount: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;

  markFullyPaid: (method: PaymentMethod) => Promise<void>;
}

const moneyFromBilling = (b: BillingRow): number => {
  if (b.amount_cents != null) return Number(b.amount_cents) / 100;
  return Number(b.amount) || 0;
};

export function useAppointmentFinance(appointmentId?: string, patientId?: string): AppointmentFinanceData {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [billing, setBilling] = useState<BillingRow[]>([]);
  const [priorBilling, setPriorBilling] = useState<BillingRow[]>([]);
  const [insurance, setInsurance] = useState<InsuranceRow | null>(null);

  const refresh = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const [payRes, billRes, insRes, priorRes] = await Promise.all([
        supabase.from("payments").select("*").eq("appointment_id", appointmentId).order("created_at", { ascending: false }),
        supabase.from("billing_transactions").select("*").eq("appointment_id", appointmentId).order("created_at", { ascending: false }),
        patientId
          ? supabase.from("patient_insurance").select("id, member_id, co_pay, is_primary, status").eq("patient_id", patientId).eq("is_primary", true).maybeSingle()
          : Promise.resolve({ data: null } as any),
        patientId
          ? supabase
              .from("billing_transactions")
              .select("*")
              .neq("appointment_id", appointmentId)
              .in("status", ["pending", "unpaid", "outstanding"])
              .limit(200)
          : Promise.resolve({ data: [] } as any),
      ]);
      setPayments((payRes.data as PaymentRow[]) || []);
      setBilling((billRes.data as BillingRow[]) || []);
      setInsurance((insRes as any).data || null);
      setPriorBilling((priorRes as any).data || []);
    } catch (e: any) {
      console.error("finance load failed", e);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const billingCharges = billing.filter((b) => {
    const t = b.transaction_type ?? "charge";
    return t !== "discount" && t !== "refund" && t !== "payment";
  });
  const billingDiscounts = billing.filter((b) => b.transaction_type === "discount");
  const billingPayments = billing.filter((b) => b.transaction_type === "payment");

  const totalBilled = billingCharges.reduce((s, b) => s + moneyFromBilling(b), 0);
  const totalDiscounts = billingDiscounts.reduce((s, b) => s + Math.abs(moneyFromBilling(b)), 0);
  const totalPaid =
    payments
      .filter((p) => (p.status || "").toLowerCase() !== "refunded" && (p.status || "").toLowerCase() !== "failed")
      .reduce((s, p) => s + (Number(p.amount) || 0), 0) +
    billingPayments.reduce((s, b) => s + Math.abs(moneyFromBilling(b)), 0);
  const outstanding = Math.max(0, totalBilled - totalDiscounts - totalPaid);
  const priorBalance = priorBilling.reduce((s, b) => s + moneyFromBilling(b), 0);
  const currency = billing[0]?.currency?.toUpperCase() || "USD";

  // Unified payment history (real `payments` rows + ledger-only payment rows for manual patients)
  const paymentHistory: PaymentRow[] = [
    ...payments,
    ...billingPayments.map((b) => ({
      id: b.id,
      amount: Math.abs(moneyFromBilling(b)),
      status: "completed",
      payment_method: ((b.metadata as any)?.payment_method as string) || null,
      notes: b.description ?? null,
      paid_at: ((b.metadata as any)?.paid_at as string) || b.created_at,
      created_at: b.created_at,
    })),
  ].sort((a, b) => new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime());

  const recordPayment = useCallback(
    async ({ amount, method, notes }: { amount: number; method: PaymentMethod; notes?: string }) => {
      if (!appointmentId) return;
      const { data: appt } = await supabase
        .from("appointments")
        .select("practice_id, doctor_id, patient_id")
        .eq("id", appointmentId)
        .maybeSingle();

      const resolvedPatient = patientId || (appt as any)?.patient_id || null;
      const nowIso = new Date().toISOString();

      // `payments.patient_id` is a real profile FK — manual/walk-in patients have none.
      let profilePatientId: string | null = null;
      if (resolvedPatient) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", resolvedPatient)
          .maybeSingle();
        profilePatientId = (prof as any)?.user_id ?? null;
      }

      if (profilePatientId) {
        const { error } = await supabase.from("payments").insert({
          appointment_id: appointmentId,
          patient_id: profilePatientId,
          doctor_id: (appt as any)?.doctor_id || null,
          practice_id: (appt as any)?.practice_id || null,
          amount,
          payment_method: method,
          status: "completed",
          notes: notes || null,
          paid_at: nowIso,
        } as any);
        if (error) throw error;
      } else {
        // Store as a ledger payment entry so manual patients still get full history.
        const { error } = await supabase.from("billing_transactions").insert({
          appointment_id: appointmentId,
          patient_id: resolvedPatient,
          user_id: resolvedPatient,
          doctor_id: (appt as any)?.doctor_id || null,
          practice_id: (appt as any)?.practice_id || null,
          amount: Math.round(amount),
          amount_cents: Math.round(amount * 100),
          currency: (currency || "usd").toLowerCase(),
          transaction_type: "payment",
          status: "completed",
          description: notes || "Payment received",
          metadata: { source: "manual", payment_method: method, paid_at: nowIso },
        } as any);
        if (error) throw error;
      }
      toast.success("Payment recorded");
      await refresh();
    },
    [appointmentId, patientId, currency, refresh],
  );


  const applyDiscount = useCallback(
    async ({ amount, reason }: { amount: number; reason?: string }) => {
      if (!appointmentId) return;
      const { error } = await supabase.from("billing_transactions").insert({
        appointment_id: appointmentId,
        amount: Math.round(amount),
        amount_cents: Math.round(amount * 100),
        currency,
        transaction_type: "discount",
        status: "applied",
        description: reason || "Discount",
      } as any);
      if (error) throw error;
      toast.success("Discount applied");
      await refresh();
    },
    [appointmentId, currency, refresh],
  );

  const addCharge = useCallback(
    async ({
      description,
      amount,
      currency: chargeCurrency,
      metadata,
    }: {
      description: string;
      amount: number;
      currency?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!appointmentId) return;
      const { data: appt } = await supabase
        .from("appointments")
        .select("practice_id, patient_id")
        .eq("id", appointmentId)
        .maybeSingle();
      const resolvedPatient = patientId || (appt as any)?.patient_id || null;
      const { error } = await supabase.from("billing_transactions").insert({
        appointment_id: appointmentId,
        patient_id: resolvedPatient,
        user_id: resolvedPatient,
        practice_id: (appt as any)?.practice_id || null,
        amount: Math.round(amount),
        amount_cents: Math.round(amount * 100),
        currency: (chargeCurrency || currency || "uzs").toLowerCase(),
        transaction_type: "charge",
        status: "pending",
        description,
        metadata: { source: "manual", ...(metadata || {}) },
      } as any);
      if (error) throw error;
      toast.success("Charge added");
      await refresh();
    },
    [appointmentId, patientId, currency, refresh],
  );

  const markFullyPaid = useCallback(
    async (method: PaymentMethod) => {
      if (outstanding <= 0) {
        toast.info("Nothing outstanding");
        return;
      }
      await recordPayment({ amount: outstanding, method, notes: "Marked fully paid" });
    },
    [outstanding, recordPayment],
  );

  return {
    loading,
    payments,
    billing,
    insurance,
    totalBilled,
    totalPaid,
    totalDiscounts,
    outstanding,
    priorBalance,
    currency,
    refresh,
    recordPayment,
    applyDiscount,
    addCharge,
    markFullyPaid,
  };

}
