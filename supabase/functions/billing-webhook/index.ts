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

function norm(s: unknown) {
  return String(s ?? "").toLowerCase().trim();
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function mapBillingEntityToFinance(entityType: string): "clinic" | "lab" | "imaging" | "pharmacy" | null {
  const t = norm(entityType);
  if (t === "clinic") return "clinic";
  if (t === "lab") return "lab";
  if (t === "imaging") return "imaging";
  if (t === "pharmacy") return "pharmacy";
  // legacy entity names in other parts of the repo:
  if (t === "lab_center") return "lab";
  if (t === "imaging_center") return "imaging";
  return null;
}

function pickCreatedByFromMetadata(md: Record<string, unknown> | null | undefined): string | null {
  if (!md) return null;
  const candidates = [
    md["created_by"],
    md["staff_user_id"],
    md["staff_id"],
    md["user_id"],
    md["patient_id"],
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => !!x);

  for (const c of candidates) {
    if (isUuid(c)) return c;
  }
  return null;
}

function isMissingRelationError(e: any) {
  const msg = String(e?.message || e || "").toLowerCase();
  return msg.includes("does not exist") && (
    msg.includes("finance_entries") ||
    msg.includes("finance_event_links") ||
    msg.includes("finance_categories")
  );
}

async function ensureCategoryId(service: any, args: { entityType: string; entityId: string; kind: "income" | "expense" | "payroll"; name: string; createdBy: string | null }) {
  const name = String(args.name || "").trim().replace(/\s+/g, " ");
  const nameNorm = name.toLowerCase();

  // Try by name_norm first (generated column from step 20)
  const { data: found1, error: selErr1 } = await service
    .from("finance_categories")
    .select("id")
    .eq("entity_type", args.entityType)
    .eq("entity_id", args.entityId)
    .eq("kind", args.kind)
    .eq("name_norm", nameNorm)
    .limit(1);

  if (!selErr1 && found1 && found1.length > 0 && found1[0]?.id) return String(found1[0].id);

  // Fallback: case-insensitive name match
  const { data: found2, error: selErr2 } = await service
    .from("finance_categories")
    .select("id,name")
    .eq("entity_type", args.entityType)
    .eq("entity_id", args.entityId)
    .eq("kind", args.kind)
    .ilike("name", name)
    .limit(1);

  if (!selErr2 && found2 && found2.length > 0 && found2[0]?.id) return String(found2[0].id);

  // Create
  const { data: inserted, error: insErr } = await service
    .from("finance_categories")
    .insert({
      entity_type: args.entityType,
      entity_id: args.entityId,
      kind: args.kind,
      name,
      is_default: false,
      created_by: args.createdBy,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return String(inserted.id);
}

async function postFinanceForBillingTransaction(service: any, tx: any) {
  // Only completed CHARGE creates income ledger entry here
  if (norm(tx?.status) !== "completed") return;
  if (norm(tx?.transaction_type) !== "charge") return;

  const billingEntityType = String(tx?.entity_type || "").trim();
  const billingEntityId = String(tx?.entity_id || "").trim();
  const financeEntityType = mapBillingEntityToFinance(billingEntityType);
  if (!financeEntityType) return;
  if (!billingEntityId || !isUuid(billingEntityId)) return;

  const sourceTable = "billing_transactions";
  const sourceId = String(tx?.id || "").trim();
  if (!sourceId || !isUuid(sourceId)) return;

  // Dedup: if we already linked this billing tx -> finance entry, do nothing
  const { data: existingLink, error: linkSelErr } = await service
    .from("finance_event_links")
    .select("id, finance_entry_id")
    .eq("entity_type", financeEntityType)
    .eq("entity_id", billingEntityId)
    .eq("source_table", sourceTable)
    .eq("source_id", sourceId)
    .limit(1);

  if (linkSelErr) throw linkSelErr;
  if (existingLink && existingLink.length > 0) return;

  const amountCents = Number(tx?.amount_cents || 0);
  if (!Number.isFinite(amountCents) || amountCents <= 0) return;

  const currency = String(tx?.currency || "usd").toUpperCase();
  const occurredAt = tx?.created_at ? new Date(tx.created_at).toISOString() : new Date().toISOString();

  const md = (tx?.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)) ? tx.metadata : {};
  const createdBy = pickCreatedByFromMetadata(md);

  const patientName = typeof md?.patient_name === "string" ? md.patient_name.trim() : "";
  const invoiceRef = typeof tx?.invoice_id === "string" ? tx.invoice_id : null;
  const provider = typeof tx?.provider === "string" ? tx.provider : "stripe";
  const providerRef = typeof tx?.provider_ref === "string" ? tx.provider_ref : null;

  const descriptionParts: string[] = [];
  descriptionParts.push("Payment received");
  if (patientName) descriptionParts.push(`from ${patientName}`);
  if (invoiceRef) descriptionParts.push(`(invoice ${invoiceRef})`);
  const description = descriptionParts.join(" ");

  // Category: "Services" income
  const categoryId = await ensureCategoryId(service, {
    entityType: financeEntityType,
    entityId: billingEntityId,
    kind: "income",
    name: "Services",
    createdBy,
  });

  const entryMeta = {
    source: { table: sourceTable, id: sourceId },
    billing: {
      provider,
      provider_ref: providerRef,
      invoice_id: invoiceRef,
      transaction_type: tx?.transaction_type,
      status: tx?.status,
    },
    ...md,
  };

  const { data: entryRow, error: entryErr } = await service
    .from("finance_entries")
    .insert({
      entity_type: financeEntityType,
      entity_id: billingEntityId,
      occurred_at: occurredAt,
      entry_type: "income",
      amount_cents: amountCents,
      currency,
      category_id: categoryId,
      description,
      metadata: entryMeta,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (entryErr) throw entryErr;

  const financeEntryId = String(entryRow?.id);

  const { error: linkInsErr } = await service
    .from("finance_event_links")
    .insert({
      entity_type: financeEntityType,
      entity_id: billingEntityId,
      source_table: sourceTable,
      source_id: sourceId,
      finance_entry_id: financeEntryId,
    });

  // If concurrent insert happened, ignore unique violations; otherwise throw
  if (linkInsErr) {
    const msg = String(linkInsErr?.message || "").toLowerCase();
    const isUnique = msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists");
    if (!isUnique) throw linkInsErr;
  }
}

async function extractEntityFromStripe(stripe: Stripe, obj: any): Promise<{ entityType: "clinic" | "lab" | "imaging" | "pharmacy"; entityId: string; metadata: Record<string, unknown> } | null> {
  // Best case: object metadata already contains entity keys
  const md0 = (obj?.metadata && typeof obj.metadata === "object" && !Array.isArray(obj.metadata)) ? obj.metadata : {};
  const et0 = md0?.entity_type ? String(md0.entity_type) : "";
  const ei0 = md0?.entity_id ? String(md0.entity_id) : "";
  const mapped0 = mapBillingEntityToFinance(et0);
  if (mapped0 && isUuid(ei0)) return { entityType: mapped0, entityId: ei0, metadata: md0 };

  // Refund often has payment_intent or charge; retrieve PaymentIntent first
  const piId = obj?.payment_intent ? String(obj.payment_intent) : "";
  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      const md = (pi?.metadata && typeof pi.metadata === "object" && !Array.isArray(pi.metadata)) ? pi.metadata : {};
      const et = md?.entity_type ? String(md.entity_type) : "";
      const ei = md?.entity_id ? String(md.entity_id) : "";
      const mapped = mapBillingEntityToFinance(et);
      if (mapped && isUuid(ei)) return { entityType: mapped, entityId: ei, metadata: md };
    } catch {
      // ignore
    }
  }

  // Fallback: retrieve charge and inspect metadata
  const chId = obj?.charge ? String(obj.charge) : "";
  if (chId) {
    try {
      const ch = await stripe.charges.retrieve(chId);
      const md = (ch?.metadata && typeof ch.metadata === "object" && !Array.isArray(ch.metadata)) ? ch.metadata : {};
      const et = md?.entity_type ? String(md.entity_type) : "";
      const ei = md?.entity_id ? String(md.entity_id) : "";
      const mapped = mapBillingEntityToFinance(et);
      if (mapped && isUuid(ei)) return { entityType: mapped, entityId: ei, metadata: md };
    } catch {
      // ignore
    }
  }

  return null;
}

async function postFinanceForStripeRefund(service: any, stripe: Stripe, refund: Stripe.Refund) {
  // Only create ledger entry on refund creation (and keep it idempotent)
  const refundId = String(refund.id || "").trim();
  if (!refundId) return;

  // Dedup by refund id
  const sourceTable = "stripe_refunds";
  const sourceId = refundId;

  // Determine entity from metadata (payment intent / charge)
  const resolved = await extractEntityFromStripe(stripe, refund as any);
  if (!resolved) return;

  const { entityType, entityId, metadata } = resolved;

  const { data: existingLink, error: linkSelErr } = await service
    .from("finance_event_links")
    .select("id, finance_entry_id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("source_table", sourceTable)
    .eq("source_id", sourceId)
    .limit(1);

  if (linkSelErr) throw linkSelErr;
  if (existingLink && existingLink.length > 0) return;

  const amountCents = toCents((refund as any).amount);
  if (!amountCents || amountCents <= 0) return;

  const currency = String((refund as any).currency || "usd").toUpperCase();
  const occurredAt = (refund as any).created ? new Date(((refund as any).created as number) * 1000).toISOString() : new Date().toISOString();

  const createdBy = pickCreatedByFromMetadata(metadata);

  const reason = typeof (refund as any).reason === "string" ? (refund as any).reason : "";
  const status = typeof (refund as any).status === "string" ? (refund as any).status : "";
  const chargeId = refund.charge ? String(refund.charge) : "";
  const piId = (refund as any).payment_intent ? String((refund as any).payment_intent) : "";

  const patientName = typeof (metadata as any)?.patient_name === "string" ? String((metadata as any).patient_name).trim() : "";

  const descriptionParts: string[] = [];
  descriptionParts.push("Refund issued");
  if (patientName) descriptionParts.push(`to ${patientName}`);
  if (reason) descriptionParts.push(`(${reason})`);
  const description = descriptionParts.join(" ");

  // Category: "Refunds" expense (money out)
  const categoryId = await ensureCategoryId(service, {
    entityType,
    entityId,
    kind: "expense",
    name: "Refunds",
    createdBy,
  });

  // Ledger convention: entry_type='adjustment' with metadata.direction='out'
  const entryMeta = {
    direction: "out",
    source: { table: sourceTable, id: sourceId },
    billing: {
      provider: "stripe",
      refund_id: refundId,
      charge_id: chargeId || null,
      payment_intent_id: piId || null,
      status: status || null,
      reason: reason || null,
    },
    ...metadata,
  };

  const { data: entryRow, error: entryErr } = await service
    .from("finance_entries")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      occurred_at: occurredAt,
      entry_type: "adjustment",
      amount_cents: amountCents,
      currency,
      category_id: categoryId,
      description,
      metadata: entryMeta,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (entryErr) throw entryErr;

  const financeEntryId = String(entryRow?.id);

  const { error: linkInsErr } = await service
    .from("finance_event_links")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      source_table: sourceTable,
      source_id: sourceId,
      finance_entry_id: financeEntryId,
    });

  if (linkInsErr) {
    const msg = String(linkInsErr?.message || "").toLowerCase();
    const isUnique = msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists");
    if (!isUnique) throw linkInsErr;
  }
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
    // Step 28: Refunds -> Finance
    // Use refund.created to record the refund once; idempotency via finance_event_links.
    if (event.type === "refund.created") {
      const refund = event.data.object as Stripe.Refund;
      try {
        await postFinanceForStripeRefund(service, stripe, refund);
      } catch (e: any) {
        console.error("finance refund ledger write failed:", e);
        if (!isMissingRelationError(e)) {
          // swallow to avoid webhook retry storms; billing still updates below if needed
        }
      }
      return json({ ok: true }, 200);
    }

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
          stripePriceId ? `stripe_price_id.eq.${stripePriceId},code.eq.${planCode}` : `code.eq.${planCode}`,
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
          status:
            status === "paid" ? "paid" : status === "void" ? "void" : status === "uncollectible" ? "uncollectible" : "open",
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

    // Payment intent -> transaction (+ finance ledger posting for completed charge)
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

      const { data: txRow, error: txErr } = await service
        .from("billing_transactions")
        .upsert(
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
        )
        .select("id, entity_type, entity_id, status, transaction_type, currency, amount_cents, provider, provider_ref, created_at, metadata, invoice_id")
        .single();

      if (txErr) throw txErr;

      // Step 27: Ledger-first — write finance entry at capture time (idempotent via finance_event_links)
      try {
        await postFinanceForBillingTransaction(service, txRow);
      } catch (e: any) {
        // Don't fail the Stripe webhook if finance tables aren't ready yet or transient issues occur.
        console.error("finance ledger write failed:", e);
        if (!isMissingRelationError(e)) {
          // swallow to avoid Stripe retries storm
        }
      }

      return json({ ok: true }, 200);
    }

    return json({ ok: true, ignored: true }, 200);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Webhook handler failed" }, 500);
  }
});
