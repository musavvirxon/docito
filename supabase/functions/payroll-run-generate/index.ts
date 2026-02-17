// File: supabase/functions/payroll-run-generate/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { secureHandler, jsonResponse, errorResponse } from "../_shared/security-middleware.ts";

type EntityType = "practice" | "lab" | "pharmacy" | "imaging_center";
type Mode = "preview" | "create";

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  periodStart: string; // YYYY-MM-DD
  periodEndExclusive: string; // YYYY-MM-DD
  currency?: string; // default USD
  mode?: Mode; // default preview
  postToLedger?: boolean; // default true when create
  notes?: string;
};

type CompProfileRow = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  compensation_type: "salary" | "hourly";
  salary_amount_cents: number | null;
  salary_period: "monthly" | "weekly" | "daily" | null;
  hourly_rate_cents: number | null;
  payout_frequency: "monthly" | "weekly" | "daily" | "each_time";
  effective_from: string; // date
  is_active: boolean;
};

type AttendanceShiftRow = {
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  duration_minutes: number | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function parseDateOnly(v: string): Date {
  // parse as UTC midnight
  const [y, m, d] = v.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function daysBetween(start: Date, endExclusive: Date) {
  return Math.floor((endExclusive.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function roundCents(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v);
}

function minutesFromShift(s: AttendanceShiftRow) {
  if (s.duration_minutes != null && Number.isFinite(Number(s.duration_minutes))) return Math.max(0, Math.round(Number(s.duration_minutes)));
  if (!s.clock_out_at) return 0;
  const a = new Date(s.clock_in_at);
  const b = new Date(s.clock_out_at);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (60 * 1000)));
}

function monthStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonths(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function sameUtcDate(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function toIsoDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

serve(async (req) => {
  const secured = await secureHandler(req, "payroll-run-generate", {
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
  });

  if (secured.response) return secured.response;
  if (!secured.context) return errorResponse("Security context missing", 500);

  const { user, serviceClient } = secured.context;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const entityType = (body as any)?.entityType as EntityType | undefined;
  const entityId = safeText((body as any)?.entityId);
  const periodStart = safeText((body as any)?.periodStart);
  const periodEndExclusive = safeText((body as any)?.periodEndExclusive);
  const currency = (safeText((body as any)?.currency) || "USD").toUpperCase();
  const mode = (safeText((body as any)?.mode) || "preview") as Mode;
  const postToLedger = (body as any)?.postToLedger !== false; // default true
  const notes = safeText((body as any)?.notes);

  if (!entityType) return errorResponse("Missing entityType", 400);
  if (!entityId || !isUuid(entityId)) return errorResponse("Invalid entityId", 400);
  if (!periodStart || !isIsoDate(periodStart)) return errorResponse("Invalid periodStart (YYYY-MM-DD)", 400);
  if (!periodEndExclusive || !isIsoDate(periodEndExclusive)) return errorResponse("Invalid periodEndExclusive (YYYY-MM-DD)", 400);
  if (mode !== "preview" && mode !== "create") return errorResponse("Invalid mode", 400);

  const startD = parseDateOnly(periodStart);
  const endD = parseDateOnly(periodEndExclusive);
  if (!(endD > startD)) return errorResponse("periodEndExclusive must be after periodStart", 400);

  const rangeDays = daysBetween(startD, endD);
  if (rangeDays <= 0 || rangeDays > 120) {
    return errorResponse("Period range must be between 1 and 120 days", 400);
  }

  // Load active compensation profiles for the entity
  const { data: profiles, error: profErr } = await serviceClient
    .from("staff_compensation_profiles")
    .select(
      "id,entity_type,entity_id,user_id,compensation_type,salary_amount_cents,salary_period,hourly_rate_cents,payout_frequency,effective_from,is_active",
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("is_active", true)
    .lte("effective_from", periodEndExclusive)
    .limit(5000);

  if (profErr) return errorResponse(profErr.message, 500);

  const profRows = (profiles || []) as any as CompProfileRow[];
  if (profRows.length === 0) {
    return jsonResponse({
      ok: true,
      mode,
      entityType,
      entityId,
      currency,
      period: { periodStart, periodEndExclusive, days: rangeDays },
      items: [],
      totals: { totalCents: 0, staffCount: 0 },
      warnings: ["No active compensation profiles found for this entity."],
    });
  }

  const userIds = Array.from(new Set(profRows.map((p) => p.user_id)));

  // Load attendance shifts for hourly profiles (clock_in within range, closed shifts)
  const hourlyUserIds = new Set(profRows.filter((p) => p.compensation_type === "hourly").map((p) => p.user_id));
  let shiftRows: AttendanceShiftRow[] = [];

  if (hourlyUserIds.size > 0) {
    const { data: shifts, error: shiftErr } = await serviceClient
      .from("staff_attendance_shifts")
      .select("user_id,clock_in_at,clock_out_at,duration_minutes")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .in("user_id", Array.from(hourlyUserIds))
      .gte("clock_in_at", startD.toISOString())
      .lt("clock_in_at", endD.toISOString())
      .not("clock_out_at", "is", null)
      .limit(50000);

    if (shiftErr) return errorResponse(shiftErr.message, 500);
    shiftRows = (shifts || []) as any as AttendanceShiftRow[];
  }

  const minutesByUser = new Map<string, number>();
  for (const s of shiftRows) {
    const mins = minutesFromShift(s);
    if (mins <= 0) continue;
    minutesByUser.set(s.user_id, (minutesByUser.get(s.user_id) || 0) + mins);
  }

  // Determine if the date range matches a clean month
  const isMonthlyWindow = (() => {
    const ms = monthStart(startD);
    const next = addMonths(ms, 1);
    return sameUtcDate(startD, ms) && sameUtcDate(endD, next);
  })();

  const isWeeklyWindow = rangeDays === 7;
  const isDailyWindow = rangeDays === 1;

  const warnings: string[] = [];
  const items: any[] = [];
  let totalCents = 0;

  for (const p of profRows) {
    if (!userIds.includes(p.user_id)) continue;

    let amountCents = 0;
    let minutesWorked: number | null = null;
    let units: number | null = null;
    const detail: Record<string, any> = {
      compensationType: p.compensation_type,
      payoutFrequency: p.payout_frequency,
      effectiveFrom: p.effective_from,
    };

    if (p.compensation_type === "hourly") {
      const mins = minutesByUser.get(p.user_id) || 0;
      minutesWorked = mins;
      units = mins / 60;
      const rate = Number(p.hourly_rate_cents || 0);
      amountCents = roundCents(rate * (mins / 60));
      detail.hourlyRateCents = rate;
      detail.minutesWorked = mins;
      detail.hoursWorked = units;
      if (mins === 0) detail.note = "No closed shifts in range.";
    } else {
      const salary = Number(p.salary_amount_cents || 0);
      detail.salaryAmountCents = salary;
      detail.salaryPeriod = p.salary_period;

      const period = p.salary_period || "monthly";
      const windowMatches =
        (period === "monthly" && isMonthlyWindow) || (period === "weekly" && isWeeklyWindow) || (period === "daily" && isDailyWindow);

      if (!windowMatches) {
        detail.warning = "Pay window does not match salary period; paying full salary amount (no proration in Step 10).";
        warnings.push(
          `Salary window mismatch for user ${p.user_id}: salary_period=${period}, window=${periodStart}..${periodEndExclusive}.`,
        );
      }

      amountCents = Math.max(0, salary);
      minutesWorked = null;
      units = null;
    }

    totalCents += amountCents;

    items.push({
      userId: p.user_id,
      compensationProfileId: p.id,
      minutesWorked,
      units,
      amountCents,
      currency,
      details: detail,
    });
  }

  // Sort by amount desc
  items.sort((a, b) => (b.amountCents || 0) - (a.amountCents || 0));

  if (mode === "preview") {
    return jsonResponse({
      ok: true,
      mode,
      entityType,
      entityId,
      currency,
      period: { periodStart, periodEndExclusive, days: rangeDays },
      items,
      totals: { totalCents, staffCount: items.length },
      warnings,
    });
  }

  // CREATE mode: write payroll_run + items, then optionally post to finance_entries
  const { data: run, error: runErr } = await serviceClient
    .from("payroll_runs")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      period_start: periodStart,
      period_end_exclusive: periodEndExclusive,
      status: "posted",
      currency,
      total_cents: totalCents,
      notes: notes || null,
      created_by: user!.id,
    })
    .select("*")
    .single();

  if (runErr) {
    // likely unique period conflict
    return errorResponse(runErr.message, 409, "PAYROLL_RUN_CREATE_FAILED");
  }

  const itemInserts = items.map((it) => ({
    run_id: run.id,
    entity_type: entityType,
    entity_id: entityId,
    user_id: it.userId,
    compensation_profile_id: it.compensationProfileId,
    minutes_worked: it.minutesWorked,
    units: it.units,
    amount_cents: it.amountCents,
    currency,
    details: it.details,
    created_by: user!.id,
  }));

  const { data: insertedItems, error: itemsErr } = await serviceClient
    .from("payroll_run_items")
    .insert(itemInserts)
    .select("id,user_id,amount_cents");

  if (itemsErr) return errorResponse(itemsErr.message, 500, "PAYROLL_ITEMS_CREATE_FAILED");

  const ledgerPosted: any[] = [];
  if (postToLedger) {
    const nowIso = new Date().toISOString();
    const ledgerInserts = (insertedItems || []).map((it: any) => ({
      entity_type: entityType,
      entity_id: entityId,
      entry_type: "payroll",
      category_id: null,
      amount_cents: Number(it.amount_cents || 0) || 0,
      currency,
      occurred_at: nowIso,
      description: "Payroll payout",
      metadata: {
        payroll_run_id: run.id,
        payroll_item_id: it.id,
        user_id: it.user_id,
        period_start: periodStart,
        period_end_exclusive: periodEndExclusive,
      },
      created_by: user!.id,
    }));

    // filter zero
    const filtered = ledgerInserts.filter((x: any) => Number(x.amount_cents) !== 0);
    if (filtered.length > 0) {
      const { data: ledgerRows, error: ledgerErr } = await serviceClient
        .from("finance_entries")
        .insert(filtered)
        .select("id,amount_cents,metadata");

      if (ledgerErr) return errorResponse(ledgerErr.message, 500, "LEDGER_POST_FAILED");
      ledgerPosted.push(...(ledgerRows || []));
    }
  }

  return jsonResponse({
    ok: true,
    mode,
    entityType,
    entityId,
    currency,
    run,
    itemsCount: insertedItems?.length || 0,
    totals: { totalCents, staffCount: items.length },
    warnings,
    ledgerPostedCount: ledgerPosted.length,
  });
});
