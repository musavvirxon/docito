// File: src/hooks/useDoctorCommissionLedger.ts
//
// Reads the event-driven commission ledger: accruals written automatically by
// the DB trigger on every collected payment, minus payouts recorded by admins.
// Balance owed = sum(active accruals) - sum(payouts).

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

export type CommissionAccrualRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  doctor_user_id: string;
  source_payment_key: string;
  gross_amount_cents: number;
  percentage_rate: number;
  compensation_profile_id: string | null;
  commission_amount_cents: number;
  appointment_id: string | null;
  patient_id: string | null;
  status: "active" | "voided";
  accrued_at: string;
  created_at: string;
};

export type CommissionPayoutRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  doctor_user_id: string;
  amount_cents: number;
  paid_at: string;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
};

export type CommissionTotals = {
  accruedCents: number;
  paidCents: number;
  balanceCents: number;
};

type Args =
  | { mode: "entity"; entityType: FinanceEntityType; entityId: string }
  | { mode: "user"; userId?: string | null };

export function useDoctorCommissionLedger(args: Args) {
  const [accruals, setAccruals] = useState<CommissionAccrualRow[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayoutRow[]>([]);
  const [loading, setLoading] = useState(false);

  const key = args.mode === "user" ? args.userId || "" : `${args.entityType}:${args.entityId}`;

  const load = useCallback(async () => {
    if (!key) {
      setAccruals([]);
      setPayouts([]);
      return;
    }
    setLoading(true);
    try {
      let accQ = supabase
        .from("doctor_commission_accruals")
        .select("*")
        .order("accrued_at", { ascending: false })
        .limit(2000);
      let payQ = supabase
        .from("doctor_commission_payouts")
        .select("*")
        .order("paid_at", { ascending: false })
        .limit(1000);

      if (args.mode === "user") {
        accQ = accQ.eq("doctor_user_id", (args as any).userId);
        payQ = payQ.eq("doctor_user_id", (args as any).userId);
      } else {
        accQ = accQ.eq("entity_type", (args as any).entityType).eq("entity_id", (args as any).entityId);
        payQ = payQ.eq("entity_type", (args as any).entityType).eq("entity_id", (args as any).entityId);
      }

      const [accRes, payRes] = await Promise.all([accQ, payQ]);
      if (accRes.error) throw accRes.error;
      if (payRes.error) throw payRes.error;
      setAccruals(((accRes.data || []) as any) as CommissionAccrualRow[]);
      setPayouts(((payRes.data || []) as any) as CommissionPayoutRow[]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeAccruals = useMemo(() => accruals.filter((a) => a.status === "active"), [accruals]);

  /** doctor_user_id -> totals */
  const totalsByUser = useMemo(() => {
    const map = new Map<string, CommissionTotals>();
    const get = (id: string) => {
      if (!map.has(id)) map.set(id, { accruedCents: 0, paidCents: 0, balanceCents: 0 });
      return map.get(id)!;
    };
    activeAccruals.forEach((a) => {
      get(a.doctor_user_id).accruedCents += Number(a.commission_amount_cents) || 0;
    });
    payouts.forEach((p) => {
      get(p.doctor_user_id).paidCents += Number(p.amount_cents) || 0;
    });
    map.forEach((v) => {
      v.balanceCents = v.accruedCents - v.paidCents;
    });
    return map;
  }, [activeAccruals, payouts]);

  const totals: CommissionTotals = useMemo(() => {
    const accruedCents = activeAccruals.reduce((s, a) => s + (Number(a.commission_amount_cents) || 0), 0);
    const paidCents = payouts.reduce((s, p) => s + (Number(p.amount_cents) || 0), 0);
    return { accruedCents, paidCents, balanceCents: accruedCents - paidCents };
  }, [activeAccruals, payouts]);

  const accrualsByUser = useCallback(
    (userId: string) => activeAccruals.filter((a) => a.doctor_user_id === userId),
    [activeAccruals],
  );

  const recordPayout = useCallback(
    async (payload: {
      entityType: FinanceEntityType;
      entityId: string;
      doctorUserId: string;
      amountCents: number;
      notes?: string | null;
      /** Also post the payout as a payroll cost entry in Finance. */
      postToPayroll?: boolean;
      payrollCurrency?: string;
      payrollCategoryName?: string;
      doctorName?: string | null;
    }) => {
      const { data: authData } = await supabase.auth.getUser();
      const paidAt = new Date().toISOString();

      let financeEntryId: string | null = null;
      if (payload.postToPayroll) {
        const { data: entryData, error: entryError } = await supabase.rpc("finance_entry_upsert_manual", {
          p_entity_type: payload.entityType,
          p_entity_id: payload.entityId,
          p_entry_id: null,
          p_entry_type: "payroll",
          p_amount_cents: payload.amountCents,
          p_currency: (payload.payrollCurrency || "USD").toUpperCase(),
          p_occurred_at: paidAt,
          p_category_id: null,
          p_category_name: payload.payrollCategoryName || "Doctor commission",
          p_description: payload.doctorName ? `Commission payout — ${payload.doctorName}` : "Commission payout",
          p_reference: `commission_payout_${payload.doctorUserId}_${paidAt}`,
        });
        if (entryError) throw entryError;
        financeEntryId = Array.isArray(entryData) ? entryData[0]?.entry_id ?? null : (entryData as any)?.entry_id ?? null;
      }

      const { error } = await supabase.from("doctor_commission_payouts").insert({
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        doctor_user_id: payload.doctorUserId,
        amount_cents: payload.amountCents,
        paid_at: paidAt,
        paid_by: authData?.user?.id ?? null,
        notes: payload.notes || null,
        finance_entry_id: financeEntryId,
      });
      if (error) throw error;
      await load();
    },
    [load],
  );


  return {
    accruals,
    activeAccruals,
    payouts,
    loading,
    totals,
    totalsByUser,
    accrualsByUser,
    recordPayout,
    refresh: load,
  };
}
