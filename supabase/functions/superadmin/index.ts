// supabase/functions/superadmin/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

type Action =
  | "ping"
  | "whoami"
  | "list_users"
  | "list_doctor_verifications"
  | "get_doctor_verification"
  | "approve_doctor_verification"
  | "reject_doctor_verification"
  | "list_audit_logs";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
}

async function assertSuperAdmin(authedClient: ReturnType<typeof createClient>) {
  const rpc = await authedClient.rpc("is_super_admin");
  if (!rpc.error && typeof rpc.data === "boolean") {
    if (rpc.data) return true;
    throw new Error("forbidden");
  }

  const me = await authedClient.auth.getUser();
  const userId = me.data?.user?.id;
  if (!userId) throw new Error("unauthorized");

  const { data, error } = await authedClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .limit(1);

  if (error) throw new Error("forbidden");
  if (data && data.length > 0) return true;

  throw new Error("forbidden");
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(500, { error: "Missing Supabase environment variables" });
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse(401, { error: "Missing Authorization header" });
    }

    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const me = await authedClient.auth.getUser();
    const actorId = me.data?.user?.id || null;

    const body = (await req.json().catch(() => null)) as
      | null
      | {
          action?: Action;
          // shared
          limit?: number;
          offset?: number;

          // list_users
          query?: string;
          role?: string;

          // verifications
          status?: string;
          id?: string;
          reason?: string;
        };

    const action = body?.action;
    if (!action) return jsonResponse(400, { error: "Missing action" });

    // ping: no admin required
    if (action === "ping") {
      return jsonResponse(200, { ok: true, now: new Date().toISOString() });
    }

    // whoami: auth required, no admin required
    if (action === "whoami") {
      if (!actorId) return jsonResponse(401, { error: "Unauthorized" });
      return jsonResponse(200, {
        ok: true,
        user_id: actorId,
        ip_address: getIp(req),
        user_agent: req.headers.get("user-agent") || null,
      });
    }

    // Super admin only from here
    await assertSuperAdmin(authedClient);

    const serviceClient = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: { persistSession: false },
        })
      : null;

    const ip = getIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    const writeAudit = async (entry: {
      action_type: string;
      entity_type?: string | null;
      entity_id?: string | null;
      details?: Json;
    }) => {
      if (!serviceClient || !actorId) return;
      await serviceClient.from("system_audit_logs").insert({
        user_id: actorId,
        action_type: entry.action_type,
        entity_type: entry.entity_type ?? null,
        entity_id: entry.entity_id ?? null,
        details: entry.details ?? null,
        ip_address: ip,
        user_agent: userAgent,
      });
    };

    // =========================================================
    // B2) list_users (profiles + user_roles)
    // =========================================================
    if (action === "list_users") {
      const limit = Math.min(Math.max(Number(body?.limit ?? 25), 1), 200);
      const offset = Math.max(Number(body?.offset ?? 0), 0);
      const q = String(body?.query ?? "").trim().toLowerCase();
      const role = String(body?.role ?? "").trim().toLowerCase();

      // NOTE: We do not rely on RLS for profiles here; we use service role for consistent admin access.
      if (!serviceClient) return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY secret" });

      // 1) Fetch profiles (filter by query if provided)
      let pQuery = serviceClient
        .from("profiles")
        .select("user_id, full_name, email, phone, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (q) {
        // Use OR matching on common fields (works if columns exist)
        // If some fields don't exist in your schema, remove them.
        pQuery = pQuery.or(
          [
            `email.ilike.%${q}%`,
            `full_name.ilike.%${q}%`,
            `phone.ilike.%${q}%`,
            `user_id.ilike.%${q}%`,
          ].join(",")
        );
      }

      const { data: profiles, error: pErr } = await pQuery.range(offset, offset + limit - 1);
      if (pErr) return jsonResponse(500, { error: pErr.message });

      const userIds = (profiles || []).map((p) => p.user_id).filter(Boolean) as string[];
      if (userIds.length === 0) {
        await writeAudit({
          action_type: "superadmin.list_users",
          entity_type: "profiles",
          details: { query: q || null, role: role || null, limit, offset },
        });
        return jsonResponse(200, { data: [], meta: { limit, offset, query: q || null, role: role || null } });
      }

      // 2) Fetch roles for those users
      const { data: rolesRows, error: rErr } = await serviceClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rErr) return jsonResponse(500, { error: rErr.message });

      const rolesByUser = new Map<string, string[]>();
      for (const row of rolesRows || []) {
        const uid = String((row as any).user_id);
        const r = String((row as any).role || "");
        if (!uid) continue;
        if (!rolesByUser.has(uid)) rolesByUser.set(uid, []);
        if (r) rolesByUser.get(uid)!.push(r);
      }

      // 3) Combine
      let combined = (profiles || []).map((p) => ({
        ...p,
        roles: uniq((rolesByUser.get(p.user_id) || []).map((x) => String(x).toLowerCase())),
      }));

      // 4) Optional role filter (post-filter within page)
      if (role) {
        combined = combined.filter((u) => (u.roles || []).includes(role));
      }

      await writeAudit({
        action_type: "superadmin.list_users",
        entity_type: "profiles",
        details: { query: q || null, role: role || null, limit, offset },
      });

      return jsonResponse(200, {
        data: combined,
        meta: { limit, offset, query: q || null, role: role || null },
      });
    }

    // =========================================================
    // Existing actions
    // =========================================================
    if (action === "list_doctor_verifications") {
      const status = (body?.status || "pending").toLowerCase();
      const limit = Math.min(Math.max(Number(body?.limit ?? 25), 1), 200);
      const offset = Math.max(Number(body?.offset ?? 0), 0);

      const { data, error } = await authedClient
        .from("doctor_verification")
        .select(
          `
          id,
          doctor_id,
          status,
          verification_status,
          rejection_reason,
          created_at,
          updated_at,
          specialty,
          license_number,
          years_of_experience,
          verification_data
        `
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return jsonResponse(500, { error: error.message });

      await writeAudit({
        action_type: "superadmin.list_doctor_verifications",
        entity_type: "doctor_verification",
        details: { status, limit, offset },
      });

      return jsonResponse(200, { data: data ?? [], meta: { status, limit, offset } });
    }

    if (action === "get_doctor_verification") {
      const id = body?.id;
      if (!id) return jsonResponse(400, { error: "Missing id" });

      const { data, error } = await authedClient
        .from("doctor_verification")
        .select(
          `
          id,
          doctor_id,
          status,
          verification_status,
          rejection_reason,
          created_at,
          updated_at,
          specialty,
          license_number,
          years_of_experience,
          verification_data
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) return jsonResponse(500, { error: error.message });
      if (!data) return jsonResponse(404, { error: "Not found" });

      const docs = await authedClient
        .from("doctor_verification_documents")
        .select("id, doctor_verification_id, document_type, file_name, file_path, uploaded_at")
        .eq("doctor_verification_id", id)
        .order("uploaded_at", { ascending: false });

      if (docs.error) return jsonResponse(500, { error: docs.error.message });

      await writeAudit({
        action_type: "superadmin.get_doctor_verification",
        entity_type: "doctor_verification",
        entity_id: id,
      });

      return jsonResponse(200, { data, documents: docs.data ?? [] });
    }

    if (action === "approve_doctor_verification") {
      if (!serviceClient) return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY secret" });

      const id = body?.id;
      if (!id) return jsonResponse(400, { error: "Missing id" });

      const current = await serviceClient
        .from("doctor_verification")
        .select("id, doctor_id, status")
        .eq("id", id)
        .maybeSingle();

      if (current.error) return jsonResponse(500, { error: current.error.message });
      if (!current.data) return jsonResponse(404, { error: "Not found" });

      const { error } = await serviceClient
        .from("doctor_verification")
        .update({
          status: "verified",
          verification_status: "verified",
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) return jsonResponse(500, { error: error.message });

      await writeAudit({
        action_type: "superadmin.approve_doctor_verification",
        entity_type: "doctor_verification",
        entity_id: id,
        details: { doctor_id: current.data.doctor_id },
      });

      return jsonResponse(200, { ok: true });
    }

    if (action === "reject_doctor_verification") {
      if (!serviceClient) return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY secret" });

      const id = body?.id;
      const reason = (body?.reason || "").trim();
      if (!id) return jsonResponse(400, { error: "Missing id" });
      if (!reason) return jsonResponse(400, { error: "Missing reason" });

      const current = await serviceClient
        .from("doctor_verification")
        .select("id, doctor_id, status")
        .eq("id", id)
        .maybeSingle();

      if (current.error) return jsonResponse(500, { error: current.error.message });
      if (!current.data) return jsonResponse(404, { error: "Not found" });

      const { error } = await serviceClient
        .from("doctor_verification")
        .update({
          status: "rejected",
          verification_status: "rejected",
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) return jsonResponse(500, { error: error.message });

      await writeAudit({
        action_type: "superadmin.reject_doctor_verification",
        entity_type: "doctor_verification",
        entity_id: id,
        details: { doctor_id: current.data.doctor_id, reason },
      });

      return jsonResponse(200, { ok: true });
    }

    if (action === "list_audit_logs") {
      const limit = Math.min(Math.max(Number(body?.limit ?? 50), 1), 200);
      const offset = Math.max(Number(body?.offset ?? 0), 0);

      const { data, error } = await authedClient
        .from("system_audit_logs")
        .select(
          `
          id,
          user_id,
          action_type,
          entity_type,
          entity_id,
          details,
          ip_address,
          user_agent,
          created_at
        `
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return jsonResponse(500, { error: error.message });

      await writeAudit({
        action_type: "superadmin.list_audit_logs",
        entity_type: "system_audit_logs",
        details: { limit, offset },
      });

      return jsonResponse(200, { data: data ?? [], meta: { limit, offset } });
    }

    return jsonResponse(400, { error: "Unknown action" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (msg === "unauthorized") return jsonResponse(401, { error: "Unauthorized" });
    if (msg === "forbidden") return jsonResponse(403, { error: "Forbidden" });
    return jsonResponse(500, { error: msg });
  }
});
