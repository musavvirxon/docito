import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnalyticsRequest = {
  centerId: string;
  days?: number; // default 30
};

type TrendPoint = { name: string; scans: number; completed: number; revenue: number };
type ModalityPoint = { name: string; value: number; revenue: number };
type UtilPoint = { name: string; value: number };
type TurnaroundPoint = { type: string; avgHours: number };

type AnalyticsResponse = {
  kpis: {
    totalScans: number;
    revenueCents: number;
    avgReportHours: number;
    utilizationPct: number;
    scansChangePct: number;
    revenueChangePct: number;
    reportChangePct: number;
  };
  monthlyData: TrendPoint[];
  modalityData: ModalityPoint[];
  utilizationData: UtilPoint[];
  turnaroundData: TurnaroundPoint[];
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function toISODateUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateAddDaysUTC(date: Date, days: number) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function safeNum(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function pctChange(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / prev) * 100);
}

function pickModality(attachments: unknown, fallback: string) {
  const a = (attachments ?? null) as Record<string, unknown> | null;
  return (a?.modality as string) || fallback || "X-ray";
}

function isSchemaCacheOrMissingTable(error: any): boolean {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes("schema cache") || msg.includes("could not find the table") || (msg.includes("relation") && msg.includes("does not exist"));
}

async function ensureCenterAccess(supabase: any, userId: string, centerId: string) {
  const { data: adminRow } = await supabase
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();

  if ((adminRow as any)?.id) return true;

  const { data: staffRow } = await supabase
    .from("imaging_staff")
    .select("id")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean((staffRow as any)?.id);
}

async function reloadSchema(supabase: any) {
  try {
    await supabase.rpc("reload_pgrst_schema");
  } catch {
    // ignore
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: AnalyticsRequest;
  try {
    body = (await req.json()) as AnalyticsRequest;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const centerId = body?.centerId?.trim();
  const days = Math.max(7, Math.min(365, Math.floor(body?.days ?? 30)));
  if (!centerId) return json({ error: "Missing centerId" }, 400);

  const allowed = await ensureCenterAccess(supabase, user.id, centerId);
  if (!allowed) return json({ error: "Forbidden" }, 403);

  const today = new Date();
  const endDate = toISODateUTC(today);
  const startDate = toISODateUTC(dateAddDaysUTC(today, -days + 1));

  const prevEnd = toISODateUTC(dateAddDaysUTC(today, -days));
  const prevStart = toISODateUTC(dateAddDaysUTC(today, -(days * 2) + 1));

  const { data: refs, error: refErr } = await supabase
    .from("referrals")
    .select("id, preferred_date, status, attachments, reason, created_at, completed_at")
    .eq("receiver_type", "imaging_center")
    .eq("receiver_entity_id", centerId)
    .gte("preferred_date", startDate)
    .lte("preferred_date", endDate);

  if (refErr) return json({ error: refErr.message }, 500);

  const rows = (refs ?? []) as Array<{
    id: string;
    preferred_date: string | null;
    status: string;
    attachments: unknown;
    reason: string | null;
    created_at: string;
    completed_at: string | null;
  }>;

  const totalScans = rows.length;

  // Avg turnaround hours (created_at -> completed_at)
  let sumHours = 0;
  let countHours = 0;
  for (const r of rows) {
    if (!r.completed_at) continue;
    const start = new Date(r.created_at).getTime();
    const end = new Date(r.completed_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    sumHours += (end - start) / (1000 * 60 * 60);
    countHours += 1;
  }
  const avgReportHours = countHours ? Math.round((sumHours / countHours) * 10) / 10 : 0;

  // Revenue for entity (billing_transactions)
  const { data: tx, error: txErr } = await supabase
    .from("billing_transactions")
    .select("amount, created_at, provider_data")
    .eq("entity_type", "imaging_center")
    .eq("entity_id", centerId)
    .eq("status", "completed")
    .gte("created_at", new Date(`${startDate}T00:00:00.000Z`).toISOString())
    .lte("created_at", new Date(`${endDate}T23:59:59.999Z`).toISOString());

  if (txErr) return json({ error: txErr.message }, 500);

  const txRows = (tx ?? []) as Array<{ amount: number; created_at: string; provider_data: unknown }>;
  const revenueCents = txRows.reduce((s, t) => s + safeNum(t.amount), 0);

  // Previous period for deltas
  const { data: prevRefs } = await supabase
    .from("referrals")
    .select("id, status, created_at, completed_at")
    .eq("receiver_type", "imaging_center")
    .eq("receiver_entity_id", centerId)
    .gte("preferred_date", prevStart)
    .lte("preferred_date", prevEnd);

  const prevRows = (prevRefs ?? []) as Array<{ id: string; status: string; created_at: string; completed_at: string | null }>;
  const prevTotal = prevRows.length;

  let prevSumHours = 0;
  let prevCount = 0;
  for (const r of prevRows) {
    if (!r.completed_at) continue;
    const start = new Date(r.created_at).getTime();
    const end = new Date(r.completed_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    prevSumHours += (end - start) / (1000 * 60 * 60);
    prevCount += 1;
  }
  const prevAvgHours = prevCount ? prevSumHours / prevCount : 0;

  const { data: prevTx } = await supabase
    .from("billing_transactions")
    .select("amount")
    .eq("entity_type", "imaging_center")
    .eq("entity_id", centerId)
    .eq("status", "completed")
    .gte("created_at", new Date(`${prevStart}T00:00:00.000Z`).toISOString())
    .lte("created_at", new Date(`${prevEnd}T23:59:59.999Z`).toISOString());

  const prevRevenue = (prevTx ?? []).reduce((s: number, t: any) => s + safeNum(t.amount), 0);

  // Trend by date
  const dayBuckets = new Map<string, { scans: number; completed: number; revenue: number }>();
  for (let i = 0; i < days; i++) {
    const d = dateAddDaysUTC(today, -(days - 1 - i));
    const key = toISODateUTC(d);
    dayBuckets.set(key, { scans: 0, completed: 0, revenue: 0 });
  }

  for (const r of rows) {
    const key = r.preferred_date || startDate;
    if (!dayBuckets.has(key)) dayBuckets.set(key, { scans: 0, completed: 0, revenue: 0 });
    const b = dayBuckets.get(key)!;
    b.scans += 1;
    if (r.status === "completed") b.completed += 1;
  }

  for (const t of txRows) {
    const d = new Date(t.created_at);
    const key = toISODateUTC(d);
    if (!dayBuckets.has(key)) dayBuckets.set(key, { scans: 0, completed: 0, revenue: 0 });
    dayBuckets.get(key)!.revenue += safeNum(t.amount);
  }

  const monthlyData: TrendPoint[] = Array.from(dayBuckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({ name: date.slice(5), scans: v.scans, completed: v.completed, revenue: v.revenue }));

  // Modality mix
  const modalityCounts = new Map<string, number>();
  for (const r of rows) {
    const mod = pickModality(r.attachments, r.reason || "X-ray");
    modalityCounts.set(mod, (modalityCounts.get(mod) || 0) + 1);
  }

  const modalityRevenue = new Map<string, number>();
  for (const t of txRows) {
    const pd = (t.provider_data ?? null) as Record<string, unknown> | null;
    const mod = (pd?.modality as string) || "Other";
    modalityRevenue.set(mod, (modalityRevenue.get(mod) || 0) + safeNum(t.amount));
  }

  const modalityData: ModalityPoint[] = Array.from(modalityCounts.entries())
    .map(([name, value]) => ({ name, value, revenue: modalityRevenue.get(name) || 0 }))
    .sort((a, b) => b.value - a.value);

  // Utilization: tolerate missing imaging_equipment (return 0% if missing)
  let utilizationPct = 0;

  const fetchCapacity = async () => {
    const { data: equipment, error: eqErr } = await supabase
      .from("imaging_equipment")
      .select("capacity_per_day, status")
      .eq("imaging_center_id", centerId);

    if (eqErr) throw eqErr;

    const activeCapacity = (equipment ?? [])
      .filter((e: any) => (e.status || "active") === "active")
      .reduce((s: number, e: any) => s + safeNum(e.capacity_per_day), 0);

    const avgDailyScans = days ? totalScans / days : 0;
    utilizationPct = activeCapacity > 0 ? Math.min(100, Math.round((avgDailyScans / activeCapacity) * 100)) : 0;
  };

  try {
    await fetchCapacity();
  } catch (e: any) {
    if (isSchemaCacheOrMissingTable(e)) {
      await reloadSchema(supabase);
      try {
        await fetchCapacity();
      } catch {
        utilizationPct = 0;
      }
    } else {
      utilizationPct = 0;
    }
  }

  const utilizationData: UtilPoint[] = [
    { name: "Used", value: utilizationPct },
    { name: "Available", value: Math.max(0, 100 - utilizationPct) },
  ];

  // Turnaround by modality
  const turnaroundAgg = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    if (!r.completed_at) continue;
    const start = new Date(r.created_at).getTime();
    const end = new Date(r.completed_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const hours = (end - start) / (1000 * 60 * 60);
    const mod = pickModality(r.attachments, r.reason || "X-ray");
    const a = turnaroundAgg.get(mod) || { sum: 0, count: 0 };
    a.sum += hours;
    a.count += 1;
    turnaroundAgg.set(mod, a);
  }

  const turnaroundData: TurnaroundPoint[] = Array.from(turnaroundAgg.entries())
    .map(([type, v]) => ({ type, avgHours: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0 }))
    .sort((a, b) => b.avgHours - a.avgHours)
    .slice(0, 6);

  const resp: AnalyticsResponse = {
    kpis: {
      totalScans,
      revenueCents,
      avgReportHours,
      utilizationPct,
      scansChangePct: pctChange(totalScans, prevTotal),
      revenueChangePct: pctChange(revenueCents, prevRevenue),
      reportChangePct: pctChange(avgReportHours, prevAvgHours),
    },
    monthlyData,
    modalityData,
    utilizationData,
    turnaroundData,
  };

  // Always 200 to prevent client-side "non-2xx" hard failures.
  return json(resp, 200);
});
