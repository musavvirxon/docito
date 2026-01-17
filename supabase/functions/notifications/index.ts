// Path: supabase/functions/notifications/index.ts
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

type ReqBody =
  | { action: "list"; limit?: number; unreadOnly?: boolean }
  | { action: "mark_read"; id: string }
  | { action: "mark_all_read" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ ok: false, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" }, 500);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await client.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  try {
    if (body.action === "list") {
      const limit = Math.min(Math.max(body.limit ?? 25, 1), 200);
      let q = client
        .from("notifications")
        .select("id,user_id,entity_type,entity_id,role_scope,level,title,body,action_url,read_at,created_at,metadata")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (body.unreadOnly) q = q.is("read_at", null);

      const { data, error } = await q;
      if (error) throw error;

      const unreadCountRes = await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);

      return json({
        ok: true,
        notifications: data ?? [],
        unreadCount: unreadCountRes.count ?? 0,
      });
    }

    if (body.action === "mark_read") {
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);

      const { error } = await client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", body.id);

      if (error) throw error;

      return json({ ok: true });
    }

    if (body.action === "mark_all_read") {
      const { error } = await client
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);

      if (error) throw error;

      return json({ ok: true });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Failed" }, 500);
  }
});
