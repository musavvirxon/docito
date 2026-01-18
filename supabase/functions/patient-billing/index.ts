// File: supabase/functions/patient-billing/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "get_summary"
  | "create_setup_intent"
  | "set_default_payment_method"
  | "remove_payment_method"
  | "pay_invoice";

type ReqBody = {
  action: Action;
  invoiceId?: string;
  paymentMethodId?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const stripeVersion = Deno.env.get("STRIPE_API_VERSION") || "2023-10-16";

  if (!url || !anon || !service) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  if (!stripeSecret) {
    return {
      ok: false as const,
      error: "Missing STRIPE_SECRET_KEY (set via Supabase secrets)",
    };
  }

  return { ok: true as const, url, anon, service, stripeSecret, stripeVersion };
}

async function stripeRequest(
  stripeSecret: string,
  stripeVersion: string,
  method: "GET" | "POST",
  path: string,
  form?: URLSearchParams,
) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      "Stripe-Version": stripeVersion,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? form?.toString() : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.error?.type ||
      data?.message ||
      `Stripe request failed (${res.status})`;
    const code = data?.error?.code || data?.error?.decline_code || data?.error?.type || null;
    return { ok: false as const, status: res.status, error: msg, code, data };
  }

  return { ok: true as const, data };
}

async function ensureStripeCustomer(
  service: ReturnType<typeof createClient>,
  stripeSecret: string,
  stripeVersion: string,
  userId: string,
  email?: string | null,
) {
  const { data: existing, error: exErr } = await service
    .from("billing_customers")
    .select("id, user_id, email, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (exErr) throw exErr;

  if (existing?.stripe_customer_id) return existing.stripe_customer_id as string;

  const form = new URLSearchParams();
  if (email) form.set("email", email);
  form.set("metadata[user_id]", userId);

  const created = await stripeRequest(stripeSecret, stripeVersion, "POST", "customers", form);
  if (!created.ok) throw new Error(created.error);

  const stripeCustomerId = String(created.data.id);

  if (existing?.id) {
    const { error: upErr } = await service
      .from("billing_customers")
      .update({
        email: email ?? existing.email ?? null,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (upErr) throw upErr;
  } else {
    const { error: insErr } = await service.from("billing_customers").insert({
      user_id: userId,
      email: email ?? null,
      stripe_customer_id: stripeCustomerId,
    });
    if (insErr) throw insErr;
  }

  return stripeCustomerId;
}

function currencyToStripe(cur: string) {
  const c = String(cur || "USD").trim();
  if (!c) return "usd";
  return c.toLowerCase();
}

function toCents(amountNumeric: number) {
  const n = Number(amountNumeric || 0);
  return Math.round(n * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const authed = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const action = body?.action;
  if (!action) return json({ ok: false, error: "Missing action" }, 400);

  const service = createClient(env.url, env.service);

  try {
    const userId = userRes.user.id;
    const email = userRes.user.email ?? null;

    if (action === "get_summary") {
      const [{ data: customer }, { data: methods }, { data: balance }, { data: invoices }, { data: payments }] =
        await Promise.all([
          service
            .from("billing_customers")
            .select("user_id, email, stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle(),
          service
            .from("user_payment_methods")
            .select("id, provider, provider_payment_method_id, brand, last4, exp_month, exp_year, is_default, created_at")
            .eq("user_id", userId)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(5),
          service.from("patient_balance").select("outstanding, paid_total, invoice_count").eq("patient_id", userId).maybeSingle(),
          service
            .from("invoices")
            .select("id, practice_id, appointment_id, status, currency, total_amount, notes, issued_at, paid_at, created_at")
            .eq("patient_id", userId)
            .order("created_at", { ascending: false })
            .limit(50),
          service
            .from("payments")
            .select("id, invoice_id, provider, amount, currency, status, paid_at, created_at")
            .eq("patient_id", userId)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

      return json({
        ok: true,
        customer: customer || null,
        paymentMethods: methods || [],
        balance: balance || { outstanding: 0, paid_total: 0, invoice_count: 0 },
        invoices: invoices || [],
        payments: payments || [],
      });
    }

    if (action === "create_setup_intent") {
      const stripeCustomerId = await ensureStripeCustomer(service, env.stripeSecret, env.stripeVersion, userId, email);

      const form = new URLSearchParams();
      form.set("customer", stripeCustomerId);
      form.set("usage", "off_session");
      form.set("payment_method_types[]", "card");
      form.set("metadata[user_id]", userId);

      const si = await stripeRequest(env.stripeSecret, env.stripeVersion, "POST", "setup_intents", form);
      if (!si.ok) throw new Error(si.error);

      return json({ ok: true, client_secret: si.data.client_secret });
    }

    if (action === "set_default_payment_method") {
      const pmId = String(body.paymentMethodId || "").trim();
      if (!pmId) return json({ ok: false, error: "Missing paymentMethodId" }, 400);

      const stripeCustomerId = await ensureStripeCustomer(service, env.stripeSecret, env.stripeVersion, userId, email);

      // Attach PM to customer (idempotent-ish: Stripe will return error if already attached elsewhere)
      {
        const form = new URLSearchParams();
        form.set("customer", stripeCustomerId);
        const attached = await stripeRequest(env.stripeSecret, env.stripeVersion, "POST", `payment_methods/${pmId}/attach`, form);
        if (!attached.ok) {
          const msg = String(attached.error || "");
          const isAlreadyAttached =
            msg.toLowerCase().includes("already been attached") || msg.toLowerCase().includes("already attached");
          if (!isAlreadyAttached) throw new Error(attached.error);
        }
      }

      // Set default on Stripe customer invoice settings
      {
        const form = new URLSearchParams();
        form.set("invoice_settings[default_payment_method]", pmId);
        const updated = await stripeRequest(env.stripeSecret, env.stripeVersion, "POST", `customers/${stripeCustomerId}`, form);
        if (!updated.ok) throw new Error(updated.error);
      }

      // Read PM details for display
      const pm = await stripeRequest(env.stripeSecret, env.stripeVersion, "GET", `payment_methods/${pmId}`);
      if (!pm.ok) throw new Error(pm.error);

      const brand = pm.data?.card?.brand ?? null;
      const last4 = pm.data?.card?.last4 ?? null;
      const exp_month = pm.data?.card?.exp_month ?? null;
      const exp_year = pm.data?.card?.exp_year ?? null;

      // Mark all as non-default, then upsert this as default
      await service.from("user_payment_methods").update({ is_default: false, updated_at: new Date().toISOString() }).eq("user_id", userId);

      const { error: upsertErr } = await service.from("user_payment_methods").upsert(
        {
          user_id: userId,
          provider: "stripe",
          provider_payment_method_id: pmId,
          brand,
          last4,
          exp_month,
          exp_year,
          is_default: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,provider_payment_method_id" },
      );

      if (upsertErr) throw upsertErr;

      return json({ ok: true });
    }

    if (action === "remove_payment_method") {
      // Remove local default (and optionally detach from Stripe)
      const pmId = String(body.paymentMethodId || "").trim();
      if (!pmId) return json({ ok: false, error: "Missing paymentMethodId" }, 400);

      const { error: delErr } = await service
        .from("user_payment_methods")
        .delete()
        .eq("user_id", userId)
        .eq("provider", "stripe")
        .eq("provider_payment_method_id", pmId);

      if (delErr) throw delErr;

      // Best-effort detach on Stripe (ignore errors)
      try {
        await stripeRequest(env.stripeSecret, env.stripeVersion, "POST", `payment_methods/${pmId}/detach`, new URLSearchParams());
      } catch {
        // ignore
      }

      return json({ ok: true });
    }

    if (action === "pay_invoice") {
      const invoiceId = String(body.invoiceId || "").trim();
      if (!invoiceId) return json({ ok: false, error: "Missing invoiceId" }, 400);

      const { data: invoice, error: invErr } = await service
        .from("invoices")
        .select("id, patient_id, status, currency, total_amount")
        .eq("id", invoiceId)
        .maybeSingle();

      if (invErr) throw invErr;
      if (!invoice) return json({ ok: false, error: "Invoice not found" }, 404);
      if (invoice.patient_id !== userId) return json({ ok: false, error: "Forbidden" }, 403);

      if (!["issued", "draft"].includes(String(invoice.status))) {
        return json({ ok: false, error: "Invoice is not payable" }, 400);
      }

      const { data: defaultPm } = await service
        .from("user_payment_methods")
        .select("provider_payment_method_id")
        .eq("user_id", userId)
        .eq("provider", "stripe")
        .eq("is_default", true)
        .maybeSingle();

      if (!defaultPm?.provider_payment_method_id) {
        return json({ ok: false, error: "No saved card. Please add a payment method first." }, 400);
      }

      const stripeCustomerId = await ensureStripeCustomer(service, env.stripeSecret, env.stripeVersion, userId, email);

      const currency = currencyToStripe(String(invoice.currency || "USD"));
      const amountCents = toCents(Number(invoice.total_amount || 0));

      // Try off-session confirm (no client interaction)
      const form = new URLSearchParams();
      form.set("amount", String(amountCents));
      form.set("currency", currency);
      form.set("customer", stripeCustomerId);
      form.set("payment_method", String(defaultPm.provider_payment_method_id));
      form.set("confirm", "true");
      form.set("off_session", "true");
      form.set("description", `Invoice ${invoice.id}`);
      form.set("metadata[invoice_id]", invoice.id);
      form.set("metadata[user_id]", userId);

      const pi = await stripeRequest(env.stripeSecret, env.stripeVersion, "POST", "payment_intents", form);

      if (!pi.ok) {
        // If SCA required, create PI without confirm and return client_secret for confirmCardPayment
        const needsAction =
          String(pi.code || "").includes("authentication_required") ||
          String(pi.error || "").toLowerCase().includes("authentication") ||
          String(pi.error || "").toLowerCase().includes("requires_action");

        if (!needsAction) throw new Error(pi.error);

        const form2 = new URLSearchParams();
        form2.set("amount", String(amountCents));
        form2.set("currency", currency);
        form2.set("customer", stripeCustomerId);
        form2.set("payment_method", String(defaultPm.provider_payment_method_id));
        form2.set("description", `Invoice ${invoice.id}`);
        form2.set("metadata[invoice_id]", invoice.id);
        form2.set("metadata[user_id]", userId);

        const pi2 = await stripeRequest(env.stripeSecret, env.stripeVersion, "POST", "payment_intents", form2);
        if (!pi2.ok) throw new Error(pi2.error);

        return json({ ok: true, requires_action: true, client_secret: pi2.data.client_secret });
      }

      // Payment succeeded immediately
      const providerPaymentId = String(pi.data.id);
      const now = new Date().toISOString();

      // Insert payment + mark invoice as paid
      const { error: payErr } = await service.from("payments").insert({
        invoice_id: invoice.id,
        patient_id: userId,
        provider: "stripe",
        provider_payment_id: providerPaymentId,
        amount: Number(invoice.total_amount || 0),
        currency: String(invoice.currency || "USD"),
        status: "paid",
        paid_at: now,
      });
      if (payErr) throw payErr;

      const { error: invUpErr } = await service
        .from("invoices")
        .update({ status: "paid", paid_at: now })
        .eq("id", invoice.id)
        .eq("patient_id", userId);
      if (invUpErr) throw invUpErr;

      return json({ ok: true, requires_action: false });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("patient-billing error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
