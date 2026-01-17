// Path: supabase/functions/billing-webhook/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!url || !service) return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" };
  if (!stripeKey) return { ok: false as const, error: "Missing STRIPE_SECRET_KEY" };
  if (!webhookSecret) return { ok: false as const, error: "Missing STRIPE_WEBHOOK_SECRET" };
  return { ok: true as const, url, service, stripeKey, webhookSecret };
}

function toCents(amount: unknown) {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function mapSubStatus(s: string | null | undefined) {
  const v = String(s ?? "").toLowerCase();
  if (v === "active") return "active";
  if (v === "trialing") return "trialing";
  if (v === "past_due") return "past_due";
  if (v === "canceled") return "canceled";
  if (v === "unpaid") return "unpaid";
  return "inactive";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);

  const env = await requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const stripe = new Stripe(env.stripeKey, { apiVersion: "2023-10-16" });
  const sig = req.headers.get("stripe-signature") || "";

  const raw = new Uint8Array(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.webhookSecret);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: "Invalid signature" }, 400);
  }

  const service = createClient(env.url, env.service);

  try {
    // Subscription created/updated/deleted
    if (event.type.startsWith("customer.subscription.")) {
      const sub = event.data.object as Stripe.Subscription;

      const entityType = (sub.metadata?.entity_type || "") as any;
      const entityId = sub.metadata?.entity_id || "";
      const planCode = sub.metadata?.plan_code || "";

      if (!entityType || !entityId) return json({ ok: true, ignored: true }, 200);

      // Resolve plan by stripe price id if possible
      const stripePriceId = (sub.items?.data?.[0]?.price?.id as string) || null;

      const { data: plan } = await service
        .from("billing_plans")
        .select("id,code,stripe_price_id")
        .or(
          stripePriceId
            ? `stripe_price_id.eq.${stripePriceId},code.eq.${planCode}`
            : `code.eq.${planCode}`,
        )
        .maybeSingle();

      const status = mapSubStatus(sub.status);

      const cps = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
      const cpe = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

      await service.from("billing_subscriptions").upsert(
        {
          entity_type: entityType,
          entity_id: entityId,
          plan_id: plan?.id ?? null,
          status,
          started_at: sub.start_date ? new Date(sub.start_date * 1000).toISOString() : null,
          current_period_start: cps,
          current_period_end: cpe,
          cancel_at_period_end: Boolean(sub.cancel_at_period_end),
          stripe_subscription_id: sub.id,
          stripe_price_id: stripePriceId,
          stripe_customer_id: String(sub.customer),
          metadata: sub.metadata ?? {},
        },
        { onConflict: "entity_type,entity_id" },
      );

      return json({ ok: true }, 200);
    }

    // Invoice events
    if (event.type.startsWith("invoice.")) {
      const inv = event.data.object as Stripe.Invoice;

      const entityType = (inv.subscription_details?.metadata?.entity_type ||
        inv.metadata?.entity_type ||
        "") as any;

      const entityId =
        inv.subscription_details?.metadata?.entity_id || inv.metadata?.entity_id || "";

      if (!entityType || !entityId) return json({ ok: true, ignored: true }, 200);

      const status = String(inv.status || "open").toLowerCase();

      // Find subscription row (by stripe_subscription_id)
      let subscriptionId: string | null = null;
      if (inv.subscription) {
        const { data: subRow } = await service
          .from("billing_subscriptions")
          .select("id")
          .eq("stripe_subscription_id", String(inv.subscription))
          .maybeSingle();
        subscriptionId = subRow?.id ?? null;
      }

      const amountDue = toCents(inv.amount_due);
      const amountPaid = toCents(inv.amount_paid);
      const amountRemaining = toCents(inv.amount_remaining);

      await service.from("billing_invoices").upsert(
        {
          entity_type: entityType,
          entity_id: entityId,
          subscription_id: subscriptionId,
          status: (status === "paid" ? "paid" : status === "void" ? "void" : status === "uncollectible" ? "uncollectible" : "open"),
          currency: inv.currency || "usd",
          amount_due_cents: amountDue,
          amount_paid_cents: amountPaid,
          amount_remaining_cents: amountRemaining,
          due_at: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
          paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : null,
          stripe_invoice_id: inv.id,
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf_url: inv.invoice_pdf ?? null,
          line_items: inv.lines ? inv.lines.data : [],
          metadata: inv.metadata ?? {},
        },
        { onConflict: "stripe_invoice_id" },
      );

      return json({ ok: true }, 200);
    }

    // Payment intent -> transaction
    if (event.type.startsWith("payment_intent.")) {
      const pi = event.data.object as Stripe.PaymentIntent;

      const entityType = (pi.metadata?.entity_type || "") as any;
      const entityId = pi.metadata?.entity_id || "";
      if (!entityType || !entityId) return json({ ok: true, ignored: true }, 200);

      const status = String(pi.status || "pending").toLowerCase();
      const mapped =
        status === "succeeded"
          ? "completed"
          : status === "canceled"
            ? "failed"
            : status === "requires_payment_method"
              ? "failed"
              : "pending";

      await service.from("billing_transactions").upsert(
        {
          entity_type: entityType,
          entity_id: entityId,
          status: mapped,
          transaction_type: "charge",
          currency: pi.currency || "usd",
          amount_cents: toCents(pi.amount),
          provider: "stripe",
          provider_ref: pi.id,
          metadata: pi.metadata ?? {},
        },
        { onConflict: "provider_ref" },
      );

      return json({ ok: true }, 200);
    }

    return json({ ok: true, ignored: true }, 200);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Webhook handler failed" }, 500);
  }
});
