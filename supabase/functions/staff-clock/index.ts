// File: supabase/functions/staff-clock/index.ts
// Step 33: Edge Function for clock in/out (CORS + Authorization)
// - Uses RPCs staff_clock_in / staff_clock_out

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";
type Action = "clock_in" | "clock_out";

type ReqBody =
  | {
      action: "clock_in";
      entityType: FinanceEntityType;
      entityId: string;
      source?: string;
      notes?: string;
    }
  | {
      action: "clock_out";
      sessionId: string;
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
  if (!url || !anon) return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" };
  return { ok: true as const, url, anon };
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizeEntityType(v: unknown): FinanceEntityType | null {
  const t = String(v ?? "").toLowerCase().trim();
  if (t === "clinic" || t === "lab" || t === "imaging" || t === "pharmacy") return t as FinanceEntityType;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const userClient = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: u, error: uErr } = await userClient.auth.getUser();
  if (uErr || !u?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const action = String(body?.action || "").trim() as Action;

  try {
    if (action === "clock_in") {
      const entityType = normalizeEntityType(body?.entityType);
      const entityId = String(body?.entityId || "").trim();
      if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
      if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

      const source = body?.source ? String(body.source).slice(0, 32) : null;
      const notes = body?.notes ? String(body.notes).slice(0, 500) : null;

      const { data, error } = await userClient.rpc("staff_clock_in", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_source: source,
        p_notes: notes,
      });

      if (error) throw error;

      return json({ ok: true, action: "clock_in", sessionId: String(data) }, 200);
    }

    if (action === "clock_out") {
      const sessionId = String(body?.sessionId || "").trim();
      if (!isUuid(sessionId)) return json({ ok: false, error: "Invalid sessionId" }, 400);

      const { data, error } = await userClient.rpc("staff_clock_out", {
        p_session_id: sessionId,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;

      return json(
        {
          ok: true,
          action: "clock_out",
          sessionId,
          workDate: row?.work_date ?? null,
          minutesWorked: Number(row?.minutes_worked ?? 0) || 0,
        },
        200,
      );
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to process clock action" }, 500);
  }
});
