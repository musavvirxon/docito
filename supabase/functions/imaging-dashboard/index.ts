// File: supabase/functions/imaging-dashboard/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ImagingEquipmentStatus = "active" | "maintenance" | "offline" | "retired";

type DashboardRequest = {
  centerId: string;
};

type QueueItem = {
  id: string;
  orderNumber: string;
  preferredDate: string | null;
  patientName: string;
  examName: string;
  modality: string;
  status: string;
};

type EquipmentItem = {
  id: string;
  name: string;
  modality: string;
  status: ImagingEquipmentStatus;
  utilization: number;
};

type DashboardResponse = {
  stats: {
    scheduledToday: number;
    inProgress: number;
    pendingReports: number;
    completedToday: number;
  };
  queue: QueueItem[];
  equipment: EquipmentItem[];
  warnings?: string[];
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

function pickExamAndModality(
  attachments: unknown,
  fallbackReason: string | null,
): { examName: string; modality: string } {
  const a = (attachments ?? null) as Record<string, unknown> | null;
  const exam = (a?.exam_name as string) || fallbackReason || "Imaging Exam";
  const modality = (a?.modality as string) || "X-ray";
  return { examName: exam, modality };
}

function isMissingTableError(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  const m = msg.toLowerCase();
  return (
    msg.includes("Could not find the table") ||
    m.includes("schema cache") ||
    m.includes("relation") && m.includes("does not exist") ||
    m.includes("does not exist")
  );
}

async function getPatientNames(
  supabase: ReturnType<typeof createClient>,
  patientIds: string[],
) {
  const unique = Array.from(new Set(patientIds)).filter(Boolean);
  if (unique.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, first_name, last_name")
    .in("user_id", unique);

  if (error || !data) return new Map<string, string>();

  const m = new Map<string, string>();
  for (
    const row of data as Array<{
      user_id: string;
      full_name: string | null;
      first_name: string | null;
      last_name: string | null;
    }>
  ) {
    const name =
      row.full_name ||
      [row.first_name, row.last_name].filter(Boolean).join(" ") ||
      "Patient";
    m.set(row.user_id, name);
  }
  return m;
}

async function ensureCenterAccess(
  supabase: any,
  userId: string,
  centerId: string,
) {
  const { data: adminRow, error: adminErr } = await supabase
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminErr) return false;
  if ((adminRow as any)?.id) return true;

  const { data: staffRow, error: staffErr } = await supabase
    .from("imaging_staff")
    .select("id")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffErr) return false;
  return Boolean((staffRow as any)?.id);
}

function emptyDashboard(warnings: string[] = []): DashboardResponse {
  return {
    stats: { scheduledToday: 0, inProgress: 0, pendingReports: 0, completedToday: 0 },
    queue: [],
    equipment: [],
    ...(warnings.length ? { warnings } : {}),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Never throw uncaught; never return 500 for missing-table situations.
  try {
    if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    let body: DashboardRequest;
    try {
      body = (await req.json()) as DashboardRequest;
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const centerId = body?.centerId?.trim();
    if (!centerId) return json({ error: "Missing centerId" }, 400);

    const allowed = await ensureCenterAccess(supabase, user.id, centerId);
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const warnings: string[] = [];
    const today = toISODateUTC(new Date());

    // ---------------------------
    // Queue + Stats from referrals
    // ---------------------------
    const { data: referrals, error: refErr } = await supabase
      .from("referrals")
      .select(
        "id, referral_number, preferred_date, patient_id, status, reason, attachments, created_at, completed_at, result_attachments",
      )
      .eq("receiver_type", "imaging_center")
      .eq("receiver_entity_id", centerId)
      .eq("preferred_date", today)
      .order("created_at", { ascending: true });

    if (refErr) {
      return json(emptyDashboard([`referrals_query_failed:${refErr.message}`]), 200);
    }

    const refRows = (referrals ?? []) as Array<{
      id: string;
      referral_number: string | null;
      preferred_date: string | null;
      patient_id: string;
      status: string;
      reason: string | null;
      attachments: unknown;
      created_at: string;
      completed_at: string | null;
      result_attachments: unknown;
    }>;

    const patientNameMap = await getPatientNames(
      supabase,
      refRows.map((r) => r.patient_id),
    );

    const queue: QueueItem[] = refRows.slice(0, 12).map((r) => {
      const { examName, modality } = pickExamAndModality(r.attachments, r.reason);
      return {
        id: r.id,
        orderNumber: r.referral_number || `IMG-${r.id.slice(0, 8).toUpperCase()}`,
        preferredDate: r.preferred_date,
        patientName: patientNameMap.get(r.patient_id) || "Patient",
        examName,
        modality,
        status: r.status,
      };
    });

    const scheduledToday = refRows.length;
    const inProgress = refRows.filter((r) => r.status === "in_progress" || r.status === "accepted").length;

    const pendingReports = refRows
      .filter((r) => r.status !== "completed")
      .filter((r) => {
        const ra = r.result_attachments ?? null;
        const hasResults = ra !== null && JSON.stringify(ra) !== "[]" && JSON.stringify(ra) !== "{}";
        return r.status === "accepted" || r.status === "in_progress" || hasResults;
      }).length;

    const completedToday = refRows.filter((r) => r.status === "completed").length;

    // ---------------------------
    // Equipment (graceful fallback)
    // ---------------------------
    let equipment: EquipmentItem[] = [];
    const { data: equipmentRows, error: eqErr } = await supabase
      .from("imaging_equipment")
      .select("id, name, modality, status, capacity_per_day")
      .eq("imaging_center_id", centerId)
      .order("created_at", { ascending: true });

    if (eqErr) {
      if (isMissingTableError(eqErr)) warnings.push("missing_table:imaging_equipment");
      else warnings.push(`equipment_query_failed:${eqErr.message}`);
      equipment = [];
    } else {
      const modalityCounts = new Map<string, number>();
      for (const r of refRows) {
        const { modality } = pickExamAndModality(r.attachments, r.reason);
        modalityCounts.set(modality, (modalityCounts.get(modality) || 0) + 1);
      }

      equipment = (equipmentRows ?? []).map((e: any) => {
        const count = modalityCounts.get(e.modality) || 0;
        const cap = Number(e.capacity_per_day || 0);
        const utilization = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
        return {
          id: e.id,
          name: e.name,
          modality: e.modality,
          status: (e.status as ImagingEquipmentStatus) || "active",
          utilization,
        };
      });
    }

    const response: DashboardResponse = {
      stats: { scheduledToday, inProgress, pendingReports, completedToday },
      queue,
      equipment,
      ...(warnings.length ? { warnings } : {}),
    };

    return json(response, 200);
  } catch (e) {
    return json(emptyDashboard([`unhandled:${String((e as any)?.message ?? e)}`]), 200);
  }
});
