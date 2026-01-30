// Path: src/hooks/useBilling.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  interval: "month" | "year";
  amount_cents: number;
  currency: string;
  is_active: boolean;
};

export type BillingSubscription = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  plan_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type BillingInvoice = {
  id: string;
  status: string;
  currency: string;
  amount_due_cents: number;
  amount_paid_cents: number;
  amount_remaining_cents: number;
  due_at: string | null;
  paid_at: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  created_at: string;
};

type BillingFnRes = {
  ok: boolean;
  error?: string;
  invoices?: Array<Record<string, any>>;
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

async function fetchInvoicesViaFn(entityType: EntityType, entityId: string) {
  if (entityType === "clinic") {
    const { data, error } = await supabase.functions.invoke<BillingFnRes>("entity-dashboard", {
      body: { action: "billing", entityType, entityId, limit: 25 },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Failed to load billing invoices");
    return (data.invoices || []) as BillingInvoice[];
  }

  const { data, error } = await supabase.functions.invoke<BillingFnRes>("facility-billing", {
    body: { entityType, entityId, limit: 25 },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to load billing invoices");
  return (data.invoices || []) as BillingInvoice[];
}

export function useBilling(params: { entityType: EntityType; entityId: string | null }) {
  const { entityType, entityId } = params;

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!entityId) {
      setPlans([]);
      setSubscription(null);
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [plansRes, subRes, invs] = await Promise.all([
        (supabase.from as any)("billing_plans")
          .select("id,code,name,description,interval,amount_cents,currency,is_active")
          .eq("is_active", true)
          .order("amount_cents", { ascending: true }),
        (supabase.from as any)("billing_subscriptions")
          .select("id,entity_type,entity_id,plan_id,status,current_period_start,current_period_end,cancel_at_period_end")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .maybeSingle(),
        fetchInvoicesViaFn(entityType, entityId),
      ]);

      if (plansRes.error) throw plansRes.error;
      if (subRes.error) throw subRes.error;

      setPlans((plansRes.data || []) as BillingPlan[]);
      setSubscription((subRes.data || null) as BillingSubscription | null);
      setInvoices((invs || []) as BillingInvoice[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load billing");
      setPlans([]);
      setSubscription(null);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const startCheckout = useCallback(
    async (planCode: string) => {
      if (!entityId) throw new Error("Missing entityId");

      const successUrl = `${window.location.origin}/billing?success=1`;
      const cancelUrl = `${window.location.origin}/billing?canceled=1`;

      const { data, error } = await supabase.functions.invoke("billing-checkout", {
        body: { entityType, entityId, planCode, successUrl, cancelUrl },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Checkout failed");

      if (data.mode === "free") {
        await fetchAll();
        return;
      }

      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    [entityId, entityType, fetchAll],
  );

  const openPortal = useCallback(async () => {
    const returnUrl = `${window.location.origin}/billing`;
    const { data, error } = await supabase.functions.invoke("billing-portal", { body: { returnUrl } });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Portal failed");
    if (data.url) window.location.href = data.url;
  }, []);

  const planById = useMemo(() => {
    const map = new Map<string, BillingPlan>();
    for (const p of plans) map.set(p.id, p);
    return map;
  }, [plans]);

  const subscriptionPlan = useMemo(() => {
    if (!subscription?.plan_id) return null;
    return planById.get(subscription.plan_id) ?? null;
  }, [planById, subscription?.plan_id]);

  const summary = useMemo(() => {
    const currency = subscriptionPlan?.currency || "usd";
    const nextDue = invoices.find((i) => i.status === "open") || null;

    return {
      status: subscription?.status || "inactive",
      planName: subscriptionPlan?.name || "None",
      planPrice: subscriptionPlan ? money(subscriptionPlan.amount_cents, currency) : money(0, currency),
      interval: subscriptionPlan?.interval || "month",
      nextInvoiceAmount: nextDue ? money(nextDue.amount_due_cents, nextDue.currency) : null,
      nextInvoiceDueAt: nextDue?.due_at ?? null,
      currency,
    };
  }, [invoices, subscription?.status, subscriptionPlan]);

  return {
    loading,
    error,
    plans,
    subscription,
    subscriptionPlan,
    invoices,
    summary,
    actions: {
      refetch: fetchAll,
      startCheckout,
      openPortal,
    },
  };
}
