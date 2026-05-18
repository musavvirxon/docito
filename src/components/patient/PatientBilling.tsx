// File: src/components/patient/PatientBilling.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { CreditCard, Receipt, ShieldCheck, RefreshCw, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";

declare global {
  interface Window {
    Stripe?: any;
  }
}

type BillingSummaryResponse = {
  ok: boolean;
  error?: string;
  customer: { user_id: string; email: string | null; stripe_customer_id: string | null } | null;
  paymentMethods: Array<{
    id: string;
    provider: string;
    provider_payment_method_id: string;
    brand: string | null;
    last4: string | null;
    exp_month: number | null;
    exp_year: number | null;
    is_default: boolean;
    created_at: string;
  }>;
  balance: { outstanding: number; paid_total: number; invoice_count: number } | null;
  invoices: Array<{
    id: string;
    practice_id: string | null;
    appointment_id: string | null;
    status: string;
    currency: string;
    total_amount: number;
    notes: string | null;
    issued_at: string | null;
    paid_at: string | null;
    created_at: string;
  }>;
  payments: Array<{
    id: string;
    invoice_id: string | null;
    provider: string | null;
    provider_payment_id: string | null;
    amount: number;
    currency: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>;
};

type CreateSetupIntentResponse = { ok: boolean; error?: string; client_secret?: string };
type PayInvoiceResponse = {
  ok: boolean;
  error?: string;
  requires_action?: boolean;
  client_secret?: string;
  payment_intent_id?: string;
};
type ConfirmPiResponse = { ok: boolean; error?: string; status?: string };

function formatMoney(amount: number, currency: string) {
  const n = Number(amount || 0);
  const cur = String(currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

function statusBadge(status: string) {
  const s = String(status || "").toLowerCase();
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    paid: { cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2, label: "Paid" },
    issued: { cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock, label: "Issued" },
    draft: { cls: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", icon: Clock, label: "Draft" },
    void: { cls: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", icon: AlertCircle, label: "Void" },
    cancelled: { cls: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", icon: AlertCircle, label: "Cancelled" },
    failed: { cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle, label: "Failed" },
  };
  return map[s] || { cls: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", icon: AlertCircle, label: status };
}

async function loadStripeJs(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.Stripe) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.stripe.com/v3/"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Stripe.js")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Stripe.js"));
    document.head.appendChild(script);
  });
}

export const PatientBilling = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingSummaryResponse | null>(null);

  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardDialogBusy, setCardDialogBusy] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);

  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const cardElRef = useRef<any>(null);

  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);

  const publishableKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

  const defaultPm = useMemo(() => {
    const pms = data?.paymentMethods || [];
    return pms.find((m) => m.is_default) || pms[0] || null;
  }, [data?.paymentMethods]);

  const currency = useMemo(() => {
    const invCur = data?.invoices?.[0]?.currency;
    const payCur = data?.payments?.[0]?.currency;
    return invCur || payCur || "USD";
  }, [data?.invoices, data?.payments]);

  const outstanding = Number(data?.balance?.outstanding || 0);
  const paidTotal = Number(data?.balance?.paid_total || 0);
  const invoiceCount = Number(data?.balance?.invoice_count || 0);

  const issuedInvoices = useMemo(
    () => (data?.invoices || []).filter((i) => String(i.status).toLowerCase() === "issued"),
    [data?.invoices],
  );

  const notifyError = (title: string, description?: string) => {
    toast({ title, description, variant: "destructive" as any });
  };

  const notifyOk = (title: string, description?: string) => {
    toast({ title, description });
  };

  const fetchSummary = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke<BillingSummaryResponse>("patient-billing", {
        body: { action: "get_summary" },
      });
      if (error) throw error;
      if (!resp?.ok) throw new Error(resp?.error || "Failed to load billing");
      setData(resp);
    } catch (e: any) {
      console.error(e);
      notifyError("Billing failed to load", e?.message || "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void fetchSummary();
  }, [user]);

  const mountCardElement = async (clientSecret: string) => {
    if (!publishableKey) throw new Error("Missing VITE_STRIPE_PUBLISHABLE_KEY");

    await loadStripeJs();
    if (!window.Stripe) throw new Error("Stripe.js not available");

    stripeRef.current = window.Stripe(publishableKey);
    elementsRef.current = stripeRef.current.elements({ clientSecret });

    const cardMount = document.getElementById("stripe-card-mount");
    if (!cardMount) throw new Error("Card mount not found");
    cardMount.innerHTML = "";

    cardElRef.current = elementsRef.current.create("card", { hidePostalCode: true });
    cardElRef.current.mount(cardMount);

    setStripeReady(true);
  };

  const openCardDialog = async () => {
    if (!publishableKey) {
      notifyError("Missing Stripe key", "Set VITE_STRIPE_PUBLISHABLE_KEY in your frontend env.");
      return;
    }

    setCardDialogOpen(true);
    setCardDialogBusy(true);

    try {
      const { data: si, error: siErr } = await supabase.functions.invoke<CreateSetupIntentResponse>("patient-billing", {
        body: { action: "create_setup_intent" },
      });
      if (siErr) throw siErr;
      if (!si?.ok || !si.client_secret) throw new Error(si?.error || "Failed to create setup intent");

      setSetupClientSecret(si.client_secret);
      await mountCardElement(si.client_secret);
    } catch (e: any) {
      console.error(e);
      notifyError("Card setup failed", e?.message || "Unknown error");
      setCardDialogOpen(false);
      setStripeReady(false);
      setSetupClientSecret(null);
    } finally {
      setCardDialogBusy(false);
    }
  };

  const closeCardDialog = () => {
    try {
      if (cardElRef.current) cardElRef.current.unmount();
    } catch {
      // ignore
    }
    stripeRef.current = null;
    elementsRef.current = null;
    cardElRef.current = null;
    setStripeReady(false);
    setSetupClientSecret(null);
    setCardDialogOpen(false);
  };

  const saveCard = async () => {
    if (!stripeRef.current || !cardElRef.current || !setupClientSecret) return;

    setCardDialogBusy(true);
    try {
      const email = user?.email || undefined;

      const res = await stripeRef.current.confirmCardSetup(setupClientSecret, {
        payment_method: { card: cardElRef.current, billing_details: { email } },
      });

      if (res?.error) throw new Error(res.error.message || "Card confirmation failed");
      const pmId = res?.setupIntent?.payment_method;
      if (!pmId) throw new Error("No payment method returned");

      const { data: setRes, error: setErr } = await supabase.functions.invoke<{ ok: boolean; error?: string }>(
        "patient-billing",
        { body: { action: "set_default_payment_method", paymentMethodId: pmId } },
      );

      if (setErr) throw setErr;
      if (!setRes?.ok) throw new Error(setRes?.error || "Failed to save payment method");

      notifyOk("Card saved", "Your card is now set as default.");
      closeCardDialog();
      await fetchSummary();
    } catch (e: any) {
      console.error(e);
      notifyError("Failed to save card", e?.message || "Unknown error");
    } finally {
      setCardDialogBusy(false);
    }
  };

  const removeCard = async () => {
    if (!defaultPm) return;

    try {
      const { data: r, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>("patient-billing", {
        body: { action: "remove_payment_method", paymentMethodId: defaultPm.provider_payment_method_id },
      });
      if (error) throw error;
      if (!r?.ok) throw new Error(r?.error || "Failed to remove card");

      notifyOk("Card removed");
      await fetchSummary();
    } catch (e: any) {
      console.error(e);
      notifyError("Failed to remove card", e?.message || "Unknown error");
    }
  };

  const payInvoice = async (invoiceId: string) => {
    if (!publishableKey) {
      notifyError("Missing Stripe key", "Set VITE_STRIPE_PUBLISHABLE_KEY in your frontend env.");
      return;
    }

    try {
      const { data: r, error } = await supabase.functions.invoke<PayInvoiceResponse>("patient-billing", {
        body: { action: "pay_invoice", invoiceId },
      });
      if (error) throw error;
      if (!r?.ok) throw new Error(r?.error || "Payment failed");

      if (r.requires_action && r.client_secret && r.payment_intent_id) {
        await loadStripeJs();
        if (!window.Stripe) throw new Error("Stripe.js not available");
        const stripe = window.Stripe(publishableKey);

        const result = await stripe.confirmCardPayment(r.client_secret);
        if (result?.error) throw new Error(result.error.message || "Authentication failed");

        const { data: c, error: cErr } = await supabase.functions.invoke<ConfirmPiResponse>("patient-billing", {
          body: { action: "confirm_payment_intent", invoiceId, paymentIntentId: r.payment_intent_id },
        });
        if (cErr) throw cErr;
        if (!c?.ok) throw new Error(c?.error || "Failed to finalize payment");

        notifyOk("Payment completed");
      } else {
        notifyOk("Payment completed");
      }

      await fetchSummary();
    } catch (e: any) {
      console.error(e);
      notifyError("Payment failed", e?.message || "Unknown error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Wallet & Billing</h2>
          <p className="text-muted-foreground">Save a card for faster checkout and track invoices & payments.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchSummary()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => void openCardDialog()}>
            <CreditCard className="h-4 w-4 mr-2" />
            {defaultPm ? "Update card" : "Add card"}
          </Button>
        </div>
      </div>

      {/* Payments recorded directly by your doctors */}
      <PatientPaymentsList
        patientUserId={user?.id || null}
        title="Doctor-recorded payments"
        emptyText="No payments have been recorded by your doctors yet."
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-600">{formatMoney(outstanding, currency)}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-50 dark:bg-yellow-900/20">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid total</p>
                <p className="text-2xl font-bold text-green-600">{formatMoney(paidTotal, currency)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invoices</p>
                <p className="text-2xl font-bold">{invoiceCount}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card on file */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Payment method
            </CardTitle>
            <div className="text-sm text-muted-foreground">Your card details are tokenized by Stripe.</div>
          </div>

          {defaultPm ? (
            <Button variant="outline" onClick={() => void removeCard()}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {defaultPm ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium capitalize">
                    {defaultPm.brand || "Card"} •••• {defaultPm.last4 || "----"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Expires {defaultPm.exp_month || "--"}/{defaultPm.exp_year || "----"}
                  </div>
                </div>
              </div>

              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Default</Badge>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground flex items-center justify-between gap-3 flex-wrap">
              <div>No saved card yet.</div>
              <Button onClick={() => void openCardDialog()}>
                <CreditCard className="h-4 w-4 mr-2" />
                Add card
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices
          </h3>

          {issuedInvoices.length > 0 ? (
            <div className="text-sm text-muted-foreground">
              {issuedInvoices.length} invoice{issuedInvoices.length === 1 ? "" : "s"} ready to pay
            </div>
          ) : null}
        </div>

        {(data?.invoices || []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="font-semibold text-foreground mb-1">No invoices yet</div>
              <div className="text-sm">When a clinic issues an invoice for your visit, it will appear here.</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(data?.invoices || []).map((inv) => {
              const st = statusBadge(inv.status);
              const Icon = st.icon;
              const payable = String(inv.status).toLowerCase() === "issued";

              return (
                <Card key={inv.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">Invoice</span>
                          <span className="text-muted-foreground text-sm">#{inv.id.slice(0, 8)}</span>
                          <Badge className={cn("text-xs", st.cls)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {st.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created {format(new Date(inv.created_at), "MMM dd, yyyy")}
                          {inv.paid_at ? ` • Paid ${format(new Date(inv.paid_at), "MMM dd, yyyy")}` : ""}
                        </div>
                        {inv.notes ? <div className="text-sm text-muted-foreground">{inv.notes}</div> : null}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-lg">{formatMoney(inv.total_amount, inv.currency)}</div>
                          <div className="text-xs text-muted-foreground uppercase">{inv.currency}</div>
                        </div>

                        {payable ? (
                          <Button
                            disabled={!defaultPm}
                            title={!defaultPm ? "Add a card first" : "Pay this invoice"}
                            onClick={() => void payInvoice(inv.id)}
                          >
                            Pay now
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Payment history</h3>

        {(data?.payments || []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <div className="text-sm">No payments recorded yet.</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(data?.payments || []).slice(0, 20).map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="font-medium capitalize">{p.provider || "payment"}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(p.created_at), "MMM dd, yyyy")}
                      {p.invoice_id ? ` • Invoice #${p.invoice_id.slice(0, 8)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        "text-xs",
                        String(p.status).toLowerCase() === "paid"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : String(p.status).toLowerCase() === "failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                      )}
                    >
                      {p.status}
                    </Badge>
                    <div className="font-semibold">{formatMoney(p.amount, p.currency)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Update Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={(open) => (open ? void openCardDialog() : closeCardDialog())}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{defaultPm ? "Update card" : "Add a card"}</DialogTitle>
            <DialogDescription>
              We use Stripe to securely save your card. Your full card number is never stored in our database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!publishableKey ? (
              <div className="text-sm text-destructive">
                Missing <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in your frontend env.
              </div>
            ) : null}

            <div className="rounded-lg border p-3">
              <div id="stripe-card-mount" className="min-h-[44px]" />
            </div>

            {!stripeReady ? <div className="text-xs text-muted-foreground">Loading payment form…</div> : null}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeCardDialog} disabled={cardDialogBusy}>
              Cancel
            </Button>
            <Button onClick={() => void saveCard()} disabled={cardDialogBusy || !publishableKey || !setupClientSecret}>
              {cardDialogBusy ? "Saving…" : "Save card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
