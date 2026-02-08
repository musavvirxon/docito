// File: supabase/functions/finance-sources/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { secureHandler, jsonResponse, errorResponse } from "../_shared/security-middleware.ts";

type EntityType = "practice" | "lab" | "pharmacy" | "imaging_center";

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  days?: number;
};

type DailyPoint = {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
  amountCents: number;
};

type SourceBlock = {
  key: string;
  label: string;
  supported: boolean;
  currency?: string;
  totals: {
    count: number;
    amountCents: number;
  };
  daily: DailyPoint[];
  notes?: string[];
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function isoDay(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addUtcDays(d: Date, days: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function buildDailySkeleton(startDay: Date, days: number): DailyPoint[] {
  const out: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    out.push({ date: isoDay(addUtcDays(startDay, i)), count: 0, amountCents: 0 });
  }
  return out;
}

function centsFromNumeric(n: unknown): number {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100);
}

function safeLower(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizePaymentStatus(v: unknown) {
  const s = safeLower(v);
  // current codebase uses many status fields; keep this permissive for now
  if (s === "paid" || s === "succeeded" || s === "completed") return "paid";
  if (s === "pending" || s === "unpaid") return "pending";
  if (s === "failed" || s === "void" || s === "cancelled" || s === "canceled") return "failed";
  if (s === "refunded") return "refunded";
  return s || "unknown";
}

serve(async (req) => {
  const secured = await secureHandler(req, "finance-sources", {
    requireAuth: true,
    requireRoles: ["super_admin"],
    allowedMethods: ["POST", "OPTIONS"],
    // We keep validation lightweight here since this endpoint is admin-only.
  });

  if (secured.response) return secured.response;
  if (!secured.context) return errorResponse("Security context missing", 500);

  const { serviceClient } = secured.context;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const entityType = (body as any)?.entityType as EntityType | undefined;
  const entityId = String((body as any)?.entityId || "").trim();
  const days = clampInt((body as any)?.days, 7, 365, 30);

  if (!entityType) return errorResponse("Missing entityType", 400);
  if (!entityId || !isUuid(entityId)) return errorResponse("Invalid entityId", 400);

  const now = new Date();
  const endDay = startOfUtcDay(now); // start of today (UTC)
  const startDay = addUtcDays(endDay, -(days - 1));
  const endExclusive = addUtcDays(endDay, 1);

  const dailyIndex: Record<string, number> = {};
  const dailySkeleton = buildDailySkeleton(startDay, days);
  dailySkeleton.forEach((p, idx) => (dailyIndex[p.date] = idx));

  const sources: SourceBlock[] = [];
  const notes: string[] = [];

  // -------------------------
  // PRACTICE: payments + invoices
  // -------------------------
  if (entityType === "practice") {
    // payments (cash received)
    const paymentsDaily = dailySkeleton.map((d) => ({ ...d }));
    let paymentsCurrency = "USD";

    const { data: paymentsRows, error: pErr } = await serviceClient
      .from("payments")
      .select("amount, currency, created_at, status")
      .eq("practice_id", entityId)
      .gte("created_at", startDay.toISOString())
      .lt("created_at", endExclusive.toISOString())
      .limit(20000);

    if (pErr) {
      sources.push({
        key: "payments",
        label: "Clinic payments (cash received)",
        supported: false,
        totals: { count: 0, amountCents: 0 },
        daily: paymentsDaily,
        notes: ["Failed to load payments."],
      });
      notes.push(`payments load error: ${pErr.message}`);
    } else {
      const rows = (paymentsRows || []) as any[];
      let totalCount = 0;
      let totalCents = 0;

      for (const r of rows) {
        if (safeLower(r?.status) !== "paid") continue;
        const dt = r?.created_at ? new Date(r.created_at) : null;
        if (!dt) continue;

        const dayKey = isoDay(startOfUtcDay(dt));
        const idx = dailyIndex[dayKey];
        if (idx === undefined) continue;

        const cents = centsFromNumeric(r?.amount);
        paymentsCurrency = String(r?.currency || paymentsCurrency || "USD").toUpperCase();

        paymentsDaily[idx].count += 1;
        paymentsDaily[idx].amountCents += cents;

        totalCount += 1;
        totalCents += cents;
      }

      sources.push({
        key: "payments",
        label: "Clinic payments (cash received)",
        supported: true,
        currency: paymentsCurrency,
        totals: { count: totalCount, amountCents: totalCents },
        daily: paymentsDaily,
        notes: ["Filtered by payments.status = 'paid'."],
      });
    }

    // invoices (billed/paid reference)
    const invoicesDaily = dailySkeleton.map((d) => ({ ...d }));
    let invoicesCurrency = "USD";

    const { data: invoiceRows, error: iErr } = await serviceClient
      .from("invoices")
      .select("total_amount, currency, created_at, status")
      .eq("practice_id", entityId)
      .gte("created_at", startDay.toISOString())
      .lt("created_at", endExclusive.toISOString())
      .limit(20000);

    if (iErr) {
      sources.push({
        key: "invoices",
        label: "Clinic invoices (paid reference)",
        supported: false,
        totals: { count: 0, amountCents: 0 },
        daily: invoicesDaily,
        notes: ["Failed to load invoices."],
      });
      notes.push(`invoices load error: ${iErr.message}`);
    } else {
      const rows = (invoiceRows || []) as any[];
      let totalCount = 0;
      let totalCents = 0;

      for (const r of rows) {
        if (safeLower(r?.status) !== "paid") continue;
        const dt = r?.created_at ? new Date(r.created_at) : null;
        if (!dt) continue;

        const dayKey = isoDay(startOfUtcDay(dt));
        const idx = dailyIndex[dayKey];
        if (idx === undefined) continue;

        const cents = centsFromNumeric(r?.total_amount);
        invoicesCurrency = String(r?.currency || invoicesCurrency || "USD").toUpperCase();

        invoicesDaily[idx].count += 1;
        invoicesDaily[idx].amountCents += cents;

        totalCount += 1;
        totalCents += cents;
      }

      sources.push({
        key: "invoices",
        label: "Clinic invoices (paid reference)",
        supported: true,
        currency: invoicesCurrency,
        totals: { count: totalCount, amountCents: totalCents },
        daily: invoicesDaily,
        notes: ["Filtered by invoices.status = 'paid'. Invoices may diverge from cash receipts."],
      });
    }
  }

  // -------------------------
  // LAB: test_orders
  // -------------------------
  if (entityType === "lab") {
    const daily = dailySkeleton.map((d) => ({ ...d }));
    const currency = "USD";

    const { data: rowsRes, error: err } = await serviceClient
      .from("test_orders")
      .select("total_amount, created_at, status, payment_status")
      .eq("lab_center_id", entityId)
      .gte("created_at", startDay.toISOString())
      .lt("created_at", endExclusive.toISOString())
      .limit(20000);

    if (err) {
      sources.push({
        key: "test_orders",
        label: "Lab test orders (operational revenue)",
        supported: false,
        currency,
        totals: { count: 0, amountCents: 0 },
        daily,
        notes: ["Failed to load test orders."],
      });
      notes.push(`test_orders load error: ${err.message}`);
    } else {
      const rows = (rowsRes || []) as any[];
      let totalCount = 0;
      let totalCents = 0;

      for (const r of rows) {
        // We treat "paid" as cash received; we will refine this in later steps.
        const pay = normalizePaymentStatus(r?.payment_status);
        if (pay !== "paid") continue;

        const dt = r?.created_at ? new Date(r.created_at) : null;
        if (!dt) continue;

        const dayKey = isoDay(startOfUtcDay(dt));
        const idx = dailyIndex[dayKey];
        if (idx === undefined) continue;

        const cents = centsFromNumeric(r?.total_amount);
        daily[idx].count += 1;
        daily[idx].amountCents += cents;

        totalCount += 1;
        totalCents += cents;
      }

      sources.push({
        key: "test_orders",
        label: "Lab test orders (cash received proxy)",
        supported: true,
        currency,
        totals: { count: totalCount, amountCents: totalCents },
        daily,
        notes: ["Filtered by test_orders.payment_status ~= 'paid' (normalized)."],
      });
    }
  }

  // -------------------------
  // PHARMACY: fulfillment_orders
  // -------------------------
  if (entityType === "pharmacy") {
    const daily = dailySkeleton.map((d) => ({ ...d }));
    const currency = "USD";

    const { data: rowsRes, error: err } = await serviceClient
      .from("fulfillment_orders")
      .select("total_amount, created_at, status, payment_status")
      .eq("pharmacy_id", entityId)
      .gte("created_at", startDay.toISOString())
      .lt("created_at", endExclusive.toISOString())
      .limit(20000);

    if (err) {
      sources.push({
        key: "fulfillment_orders",
        label: "Pharmacy fulfillment orders (operational revenue)",
        supported: false,
        currency,
        totals: { count: 0, amountCents: 0 },
        daily,
        notes: ["Failed to load fulfillment orders."],
      });
      notes.push(`fulfillment_orders load error: ${err.message}`);
    } else {
      const rows = (rowsRes || []) as any[];
      let totalCount = 0;
      let totalCents = 0;

      for (const r of rows) {
        const pay = normalizePaymentStatus(r?.payment_status);
        if (pay !== "paid") continue;

        const dt = r?.created_at ? new Date(r.created_at) : null;
        if (!dt) continue;

        const dayKey = isoDay(startOfUtcDay(dt));
        const idx = dailyIndex[dayKey];
        if (idx === undefined) continue;

        const cents = centsFromNumeric(r?.total_amount);
        daily[idx].count += 1;
        daily[idx].amountCents += cents;

        totalCount += 1;
        totalCents += cents;
      }

      sources.push({
        key: "fulfillment_orders",
        label: "Pharmacy fulfillment orders (cash received proxy)",
        supported: true,
        currency,
        totals: { count: totalCount, amountCents: totalCents },
        daily,
        notes: ["Filtered by fulfillment_orders.payment_status ~= 'paid' (normalized)."],
      });
    }
  }

  // -------------------------
  // IMAGING CENTER: no priced revenue today — show referral volume proxy
  // -------------------------
  if (entityType === "imaging_center") {
    const daily = dailySkeleton.map((d) => ({ ...d }));

    const { data: refRows, error: rErr } = await serviceClient
      .from("referrals")
      .select("created_at, status")
      .eq("receiver_type", "imaging_center")
      .eq("receiver_entity_id", entityId)
      .gte("created_at", startDay.toISOString())
      .lt("created_at", endExclusive.toISOString())
      .limit(20000);

    if (rErr) {
      sources.push({
        key: "referrals",
        label: "Imaging referrals (volume proxy — no revenue amount yet)",
        supported: false,
        totals: { count: 0, amountCents: 0 },
        daily,
        notes: ["Failed to load referrals."],
      });
      notes.push(`referrals load error: ${rErr.message}`);
    } else {
      const rows = (refRows || []) as any[];
      let totalCount = 0;

      for (const r of rows) {
        const dt = r?.created_at ? new Date(r.created_at) : null;
        if (!dt) continue;

        const dayKey = isoDay(startOfUtcDay(dt));
        const idx = dailyIndex[dayKey];
        if (idx === undefined) continue;

        daily[idx].count += 1;
        totalCount += 1;
      }

      sources.push({
        key: "referrals",
        label: "Imaging referrals (volume proxy — no revenue amount yet)",
        supported: true,
        totals: { count: totalCount, amountCents: 0 },
        daily,
        notes: [
          "Imaging currently has no canonical priced order/charge table in DB.",
          "This is a volume proxy only (counts by day).",
        ],
      });

      notes.push("imaging_center revenue amounts are not yet available in schema; only volume proxy is returned.");
    }
  }

  return jsonResponse({
    ok: true,
    entityType,
    entityId,
    window: {
      startUtc: startDay.toISOString(),
      endExclusiveUtc: endExclusive.toISOString(),
      days,
    },
    sources,
    notes,
  });
});
