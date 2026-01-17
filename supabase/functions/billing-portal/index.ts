// Path: supabase/functions/billing-portal/index.ts
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

type ReqBody = { returnUrl: string };

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

  const returnUrl = safeUrl(body?.returnUrl);
  if (!returnUrl) return json({ ok: false, error: "Missing returnUrl" }, 400);

  const service = createClient(env.url, env.service);
  const stripe = new Stripe(env.stripeKey, { apiVersion: "2023-10-16" });

  try {
    const { data: customer, error: cErr } = await service
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userRes.user.id)
      .maybeSingle();

    if (cErr) throw cErr;

    const stripeCustomerId = customer?.stripe_customer_id;
    if (!stripeCustomerId) return json({ ok: false, error: "No billing customer found for user" }, 404);

    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return json({ ok: true, url: portal.url }, 200);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to create portal session" }, 500);
  }
});
