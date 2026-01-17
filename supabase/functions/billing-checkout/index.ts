// Path: supabase/functions/billing-checkout/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

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

type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  planCode: string; // maps to billing_plans.code
  successUrl: string;
  cancelUrl: string;
};

async function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!url || !anon || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" };
  }
  if (!stripeKey) return { ok: false as const, error: "Missing STRIPE_SECRET_KEY" };
  return { ok: true as const, url, anon, service, stripeKey };
}

function safeUrl(u: unknown) {
  const s = String(u ?? "").trim();
  if (!s.startsWith("http://") && !s.startsWith("https://")) return "";
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

  const env = await requireEnv();
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

  const entityType = body?.entityType;
  const entityId = String(body?.entityId ?? "").trim();
  const planCode = String(body?.planCode ?? "").trim();
  const successUrl = safeUrl(body?.successUrl);
  const cancelUrl = safeUrl(body?.cancelUrl);

  if (!entityType || !entityId || !planCode || !successUrl || !cancelUrl) {
    return json({ ok: false, error: "Missing entityType/entityId/planCode/successUrl/cancelUrl" }, 400);
  }

  // Must have access to that entity (do not use service role yet)
  const { data: hasAccess, error: accessErr } = await authed.rpc("has_entity_access", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (accessErr) return json({ ok: false, error: accessErr.message }, 500);
  if (!hasAccess) return json({ ok: false, error: "Forbidden" }, 403);

  const service = createClient(env.url, env.service);
  const stripe = new Stripe(env.stripeKey, { apiVersion: "2023-10-16" });

  try {
    // plan lookup
    const { data: plan, error: planErr } = await service
      .from("billing_plans")
      .select("id,code,name,amount_cents,currency,interval,stripe_price_id,is_active")
      .eq("code", planCode)
      .maybeSingle();

    if (planErr) throw planErr;
    if (!plan || !plan.is_active) return json({ ok: false, error: "Invalid plan" }, 400);

    if (plan.amount_cents === 0) {
      // free plan: just upsert subscription locally (no Stripe)
      const { data: subRow, error: subErr } = await service
        .from("billing_subscriptions")
        .upsert(
          {
            entity_type: entityType,
            entity_id: entityId,
            plan_id: plan.id,
            status: "active",
            started_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: null,
            cancel_at_period_end: false,
            created_by: userRes.user.id,
            metadata: { source: "free_plan" },
          },
          { onConflict: "entity_type,entity_id" },
        )
        .select("id,status,entity_type,entity_id,plan_id")
        .single();

      if (subErr) throw subErr;
      return json({ ok: true, mode: "free", subscription: subRow, redirectUrl: successUrl }, 200);
    }

    if (!plan.stripe_price_id) {
      return json({ ok: false, error: "Plan is missing stripe_price_id" }, 500);
    }

    // ensure customer exists
    const { data: existingCustomer, error: cErr } = await service
      .from("billing_customers")
      .select("id,user_id,email,stripe_customer_id")
      .eq("user_id", userRes.user.id)
      .maybeSingle();

    if (cErr) throw cErr;

    let stripeCustomerId = existingCustomer?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const created = await stripe.customers.create({
        email: userRes.user.email ?? undefined,
        metadata: { supabase_user_id: userRes.user.id },
      });

      stripeCustomerId = created.id;

      const { error: upErr } = await service.from("billing_customers").upsert(
        {
          user_id: userRes.user.id,
          email: userRes.user.email ?? null,
          stripe_customer_id: stripeCustomerId,
        },
        { onConflict: "user_id" },
      );

      if (upErr) throw upErr;
    }

    // create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          supabase_user_id: userRes.user.id,
          entity_type: entityType,
          entity_id: entityId,
          plan_code: plan.code,
        },
      },
      metadata: {
        supabase_user_id: userRes.user.id,
        entity_type: entityType,
        entity_id: entityId,
        plan_code: plan.code,
      },
    });

    return json({ ok: true, checkoutUrl: session.url }, 200);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to create checkout" }, 500);
  }
});
