// File: supabase/functions/submit-feedback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FeedbackType = "bug" | "feature" | "other";
type Severity = "low" | "medium" | "high";

type SubmitBody = {
  type: FeedbackType;
  severity: Severity;
  title: string;
  message: string;
  steps?: string | null;
  expected?: string | null;
  actual?: string | null;
  page_url?: string | null;
  role?: string | null;
  roles?: unknown;
  user_email?: string | null;
  user_name?: string | null;
  app_version?: string | null;
  user_agent?: string | null;
  metadata?: unknown;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isType(v: unknown): v is FeedbackType {
  return v === "bug" || v === "feature" || v === "other";
}

function isSeverity(v: unknown): v is Severity {
  return v === "low" || v === "medium" || v === "high";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Missing Supabase environment variables" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    let body: SubmitBody;
    try {
      body = (await req.json()) as SubmitBody;
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const type = body?.type;
    const severity = body?.severity;
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();

    if (!isType(type)) return json({ error: "Invalid type" }, 400);
    if (!isSeverity(severity)) return json({ error: "Invalid severity" }, 400);
    if (title.length < 4) return json({ error: "Title too short" }, 400);
    if (message.length < 10) return json({ error: "Message too short" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { error: insertErr } = await admin.from("feedback").insert({
      user_id: user.id,
      type,
      severity,
      title,
      message,
      steps: body.steps ? String(body.steps).trim() : null,
      expected: body.expected ? String(body.expected).trim() : null,
      actual: body.actual ? String(body.actual).trim() : null,
      page_url: body.page_url ? String(body.page_url).trim() : null,
      role: body.role ? String(body.role).trim() : null,
      roles: body.roles ?? null,
      user_email: body.user_email ? String(body.user_email).trim() : null,
      user_name: body.user_name ? String(body.user_name).trim() : null,
      app_version: body.app_version ? String(body.app_version).trim() : null,
      user_agent: body.user_agent ? String(body.user_agent).trim() : null,
      metadata: (body.metadata && typeof body.metadata === "object") ? body.metadata : {},
    });

    if (insertErr) return json({ error: insertErr.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
