// File: supabase/functions/stripe-webhook/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeVersion = Deno.env.get("STRIPE_API_VERSION") || "2023-10-16";

  if (!url || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" };
  }
  if (!stripeSecret) {
    return { ok: false as const, error: "Missing STRIPE_SECRET_KEY" };
  }
  if (!stripeWebhookSecret) {
    return { ok: false as const, error: "Missing STRIPE_WEBHOOK_SECRET" };
  }
  return { ok: true as const, url, service, stripeSecret, stripeWebhookSecret, stripeVersion };
}

// Minimal Stripe signature verification (no dependency)
async function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string) {
  // Stripe-Signature: t=...,v1=...,v0=...
  const parts = sigHeader.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return { ok: false as const, error: "Invalid Stripe-Signature header" };

  const timestamp = tPart.slice(2);
  const v1 = v1Part.slice(3);

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // constant-time compare
  if (expected.length !== v1.length) return { ok: false as const, error: "Signature mismatch" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  if (diff !== 0) return { ok: false as const, error: "Signature mismatch" };

  return { ok: true as const, timestamp };
}

async function stripeGet(stripeSecret: string, stripeVersion: string, path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      "Stripe-Version": stripeVersion,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe GET failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return json({ ok: false, error: "Missing stripe-signature" }, 400);

  const rawBody = await req.text();

  const verified = await verifyStripeSignature(rawBody, sig, env.stripeWebhookSecret);
  if (!verified.ok) return json({ ok: false, error: verified.error }, 400);

  let evt: any;
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const service = createClient(env.url, env.service);

  try {
    const type = String(evt?.type || "");
    const obj = evt?.data?.object;

    // Keep local invoice/payment state consistent even if SCA happens or off-session fails/succeeds later.
    if (type === "payment_intent.succeeded") {
      const piId = String(obj?.id || "");
      const invoiceId = String(obj?.metadata?.invoice_id || "");
      const userId = String(obj?.metadata?.user_id || "");

      if (invoiceId && userId) {
        // Mark invoice paid and insert payment if not exists
        const now = new Date().toISOString();

        // Avoid duplicates
        const { data: existingPay } = await service
          .from("payments")
          .select("id")
          .eq("provider", "stripe")
          .eq("provider_payment_id", piId)
          .maybeSingle();

        if (!existingPay?.id) {
          // Fetch invoice for amount/currency
          const { data: inv, error: invErr } = await service
            .from("invoices")
            .select("id, patient_id, total_amount, currency")
            .eq("id", invoiceId)
            .maybeSingle();
          if (invErr) throw invErr;

          const amount = Number(inv?.total_amount || 0);
          const currency = String(inv?.currency || "USD");

          const { error: insErr } = await service.from("payments").insert({
            invoice_id: invoiceId,
            patient_id: userId,
            provider: "stripe",
            provider_payment_id: piId,
            amount,
            currency,
            status: "paid",
            paid_at: now,
          });
          if (insErr) throw insErr;
        }

        const { error: upErr } = await service
          .from("invoices")
          .update({ status: "paid", paid_at: now })
          .eq("id", invoiceId)
          .eq("patient_id", userId);
        if (upErr) throw upErr;
      }
    }

    if (type === "payment_intent.payment_failed") {
      const piId = String(obj?.id || "");
      const invoiceId = String(obj?.metadata?.invoice_id || "");
      const userId = String(obj?.metadata?.user_id || "");
      if (invoiceId && userId && piId) {
        // Optional: write a failed payment record if you want audit trail
        const { data: existingFail } = await service
          .from("payments")
          .select("id")
          .eq("provider", "stripe")
          .eq("provider_payment_id", piId)
          .maybeSingle();

        if (!existingFail?.id) {
          const { data: inv, error: invErr } = await service
            .from("invoices")
            .select("total_amount, currency")
            .eq("id", invoiceId)
            .maybeSingle();
          if (invErr) throw invErr;

          const { error: insErr } = await service.from("payments").insert({
            invoice_id: invoiceId,
            patient_id: userId,
            provider: "stripe",
            provider_payment_id: piId,
            amount: Number(inv?.total_amount || 0),
            currency: String(inv?.currency || "USD"),
            status: "failed",
            paid_at: null,
          });
          if (insErr) throw insErr;
        }
      }
    }

    // Optional: keep card metadata in sync if user adds/removes cards outside your UI.
    if (type === "payment_method.attached") {
      const pmId = String(obj?.id || "");
      const customerId = String(obj?.customer || "");
      if (pmId && customerId) {
        // Find user by stripe_customer_id
        const { data: cust, error: cErr } = await service
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (cErr) throw cErr;

        if (cust?.user_id) {
          const pm = await stripeGet(env.stripeSecret, env.stripeVersion, `payment_methods/${pmId}`);
          const brand = pm?.card?.brand ?? null;
          const last4 = pm?.card?.last4 ?? null;
          const exp_month = pm?.card?.exp_month ?? null;
          const exp_year = pm?.card?.exp_year ?? null;

          const { error: upsertErr } = await service.from("user_payment_methods").upsert(
            {
              user_id: cust.user_id,
              provider: "stripe",
              provider_payment_method_id: pmId,
              brand,
              last4,
              exp_month,
              exp_year,
              is_default: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,provider,provider_payment_method_id" },
          );
          if (upsertErr) throw upsertErr;
        }
      }
    }

    if (type === "payment_method.detached") {
      const pmId = String(obj?.id || "");
      const customerId = String(obj?.customer || "");
      if (pmId && customerId) {
        const { data: cust, error: cErr } = await service
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (cErr) throw cErr;

        if (cust?.user_id) {
          const { error: delErr } = await service
            .from("user_payment_methods")
            .delete()
            .eq("user_id", cust.user_id)
            .eq("provider", "stripe")
            .eq("provider_payment_method_id", pmId);
          if (delErr) throw delErr;
        }
      }
    }

    return json({ ok: true });
  } catch (e: any) {
    console.error("stripe-webhook error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
