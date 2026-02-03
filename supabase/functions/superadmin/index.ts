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
  | "set_user_roles"
  | "disable_user"
  | "enable_user"
  | "list_audit_logs"
  | "list_doctor_verifications"
  | "get_doctor_verification"
  | "approve_doctor_verification"
  | "reject_doctor_verification";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizeRole(input: unknown) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
}

function getUA(req: Request) {
  return req.headers.get("user-agent") || null;
}

async function assertSuperAdmin(authedClient: ReturnType<typeof createClient>) {
  // Preferred: SECURITY DEFINER RPC
  const rpc = await authedClient.rpc("is_super_admin");
  if (!rpc.error && typeof rpc.data === "boolean") {
    if (rpc.data) return true;
    throw new Error("forbidden");
  }

  // Fallback: direct lookup (may be blocked if RLS disallows)
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
      return jsonResponse(500, { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
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

          // shared pagination
          limit?: number;
          offset?: number;

          // list_users
          query?: string | null;
          role?: string | null;

          // set_user_roles
          user_id?: string;
          mode?: "replace" | "add" | "remove";
          roles?: string[];

          // enable/disable
          reason?: string | null;

          // audit logs
          action_type?: string | null;

          // verifications
          status?: string | null;
          id?: string | null;
        };

    const action = body?.action;
    if (!action) return jsonResponse(400, { error: "Missing action" });

    // Non-admin utility endpoints (still require auth)
    if (action === "ping") {
      return jsonResponse(200, { ok: true, now: new Date().toISOString() });
    }

    if (action === "whoami") {
      if (!actorId) return jsonResponse(401, { error: "Unauthorized" });
      return jsonResponse(200, {
        ok: true,
        user_id: actorId,
        ip_address: getIp(req),
        user_agent: getUA(req),
      });
    }

    // Super admin required from here
    await assertSuperAdmin(authedClient);

    const serviceClient = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
      : null;

    const ip = getIp(req);
    const userAgent = getUA(req);

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
        action: entry.action_type, // keep legacy + new in sync
        entity_type: entry.entity_type ?? null,
        entity_id: entry.entity_id ?? null,
        details: entry.details ?? null,
        ip_address: ip,
        user_agent: userAgent,
      } as any);
    };

    // =========================================================
    // list_users (profiles + user_roles) via service role
    // =========================================================
    if (action === "list_users") {
      if (!serviceClient) return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

      const limit = Math.min(Math.max(Number(body?.limit ?? 25), 1), 200);
      const offset = Math.max(Number(body?.offset ?? 0), 0);
      const q = String(body?.query ?? "").trim();
      const roleFilter = normalizeRole(body?.role ?? "");

      let qProfiles = serviceClient
        .from("profiles")
        .select("user_id, full_name, email, phone, created_at, updated_at, disabled, disabled_at, disabled_reason")
        .order("created_at", { ascending: false });

      if (q) {
        const qLower = q.toLowerCase();
        qProfiles = qProfiles.or(
          [
            `email.ilike.%${qLower}%`,
            `full_name.ilike.%${qLower}%`,
            `phone.ilike.%${qLower}%`,
            `user_id.ilike.%${qLower}%`,
          ].join(",")
        );
      }

      const { data: profiles, error: pErr } = await qProfiles.range(offset, offset + limit - 1);
      if (pErr) return jsonResponse(500, { error: pErr.message });

      const userIds = (profiles || []).map((p: any) => p.user_id).filter(Boolean) as string[];
      if (userIds.length === 0) {
        await writeAudit({
          action_type: "superadmin.list_users",
          entity_type: "profiles",
          details: { query: q || null, role: roleFilter || null, limit, offset },
        });
        return jsonResponse(200, { data: [], meta: { limit, offset, query: q || null, role: roleFilter || null } });
      }

      const { data: rolesRows, error: rErr } = await serviceClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rErr) return jsonResponse(500, { error: rErr.message });

      const rolesByUser = new Map<string, string[]>();
      for (const row of rolesRows || []) {
        const uid = String((row as any).user_id || "");
        const r = normalizeRole((row as any).role || "");
        if (!uid || !r) continue;
        if (!rolesByUser.has(uid)) rolesByUser.set(uid, []);
        rolesByUser.get(uid)!.push(r);
      }

      let combined = (profiles || []).map((p: any) => ({
        ...p,
        roles: uniq(rolesByUser.get(String(p.user_id)) || []),
      }));

      if (roleFilter) {
        combined = combined.filter((u: any) => (u.roles || []).includes(roleFilter));
      }

      await writeAudit({
        action_type: "superadmin.list_users",
        entity_type: "profiles",
        details: { query: q || null, role: roleFilter || null, limit, offset },
      });

      return jsonResponse(200, { data: combined, meta: { limit, offset, query: q || null, role: roleFilter || null } });
    }

    // =========================================================
    // set_user_roles (replace/add/remove) via service role
    // =========================================================
    if (action === "set_user_roles") {
      if (!serviceClient) return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

      const userId = String(body?.user_id || "").trim();
      if (!userId) return jsonResponse(400, { error: "Missing user_id" });

      const mode = (body?.mode || "replace") as "replace" | "add" | "remove";
      const rolesIn = Array.isArray(body?.roles) ? body!.roles! : [];
      const roles = uniq(rolesIn.map((r) => normalizeRole(r)).filter(Boolean));

      const { data: existingRows, error: exErr } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (exErr) return jsonResponse(500, { error: exErr.message });

      const existing = uniq((existingRows || []).map((x: any) => normalizeRole(x.role)));

      let next: string[] = existing;
      if (mode === "replace") next = roles;
      if (mode === "add") next = uniq([...existing, ...roles]);
      if (mode === "remove") {
        const removeSet = new Set(roles);
        next = existing.filter((r) => !removeSet.has(r));
      }

      if (next.length === 0) return jsonResponse(400, { error: "User must have at least one role" });

      if (mode === "replace") {
        const { error: delErr } = await serviceClient.from("user_roles").delete().eq("user_id", userId);
        if (delErr) return jsonResponse(500, { error: delErr.message });

        const inserts = next.map((r) => ({ user_id: userId, role: r }));
        const { error: insErr } = await serviceClient.from("user_roles").insert(inserts as any);
        if (insErr) return jsonResponse(400, { error: insErr.message });
      }

      if (mode === "add") {
        const inserts = roles.map((r) => ({ user_id: userId, role: r }));
        // rely on unique index (user_id, role) + upsert to avoid errors
        const { error: upErr } = await serviceClient
          .from("user_roles")
          .upsert(inserts as any, { onConflict: "user_id,role", ignoreDuplicates: true } as any);
        if (upErr) return jsonResponse(400, { error: upErr.message });
      }

      if (mode === "remove") {
        if (roles.length > 0) {
          const { error: delErr } = await serviceClient
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .in("role", roles as any);
          if (delErr) return jsonResponse(500, { error: delErr.message });
        }
      }

      await writeAudit({
        action_type: "superadmin.set_user_roles",
        entity_type: "user_roles",
        entity_id: userId,
        details: { mode, before: existing, requested: roles, after: next },
      });

      return jsonResponse(200, { ok: true, user_id: userId, roles: next });
    }

    // =========================================================
    // disable_user / enable_user (auth.admin ban/unban) via service role
    // =========================================================
    if (action === "disable_user" || action === "enable_user") {
      if (!serviceClient) return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

      const userId = String(body?.user_id || "").trim();
      if (!userId) return jsonResponse(400, { error: "Missing user_id" });

      const reason = String(body?.reason || "").trim() || null;
      const isDisable = action === "disable_user";

      // Ban/unban in Auth
      const banDuration = isDisable ? "876000h" : "none"; // ~100 years
      const { data, error } = await serviceClient.auth.admin.updateUserById(userId, { ban_duration: banDuration });
      if (error) return jsonResponse(500, { error: error.message });

      // Best-effort profile flags (ignore failures if columns don't exist)
      const nowIso = new Date().toISOString();
      try {
        await serviceClient
          .from("profiles")
          .update(
            isDisable
              ? ({ disabled: true, disabled_at: nowIso, disabled_reason: reason } as any)
              : ({ disabled: false, disabled_at: null, disabled_reason: null } as any)
          )
          .eq("user_id", userId);
      } catch {
        // ignore
      }

      await writeAudit({
        action_type: isDisable ? "superadmin.disable_user" : "superadmin.enable_user",
        entity_type: "auth.users",
        entity_id: userId,
        details: { reason },
      });

      return jsonResponse(200, { ok: true, user_id: userId, disabled: isDisable, auth_user: (data as any)?.user ?? null });
    }

    // =========================================================
    // list_audit_logs (RLS allows super admin)
    // =========================================================
    if (action === "list_audit_logs") {
      const limit = Math.min(Math.max(Number(body?.limit ?? 100), 1), 200);
      const offset = Math.max(Number(body?.offset ?? 0), 0);

      const { data, error } = await authedClient
        .from("system_audit_logs")
        .select("id, user_id, action, action_type, entity_type, entity_id, details, ip_address, user_agent, created_at")
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

    // =========================================================
    // Doctor Verification Queue (read via authed client; mutate via service role)
    // =========================================================
    if (action === "list_doctor_verifications") {
      const status = String(body?.status ?? "pending").trim().toLowerCase();
      const limit = Math.min(Math.max(Number(body?.limit ?? 25), 1), 200);
      const offset = Math.max(Number(body?.offset ?? 0), 0);

      let q = authedClient
        .from("doctor_verification" as any)
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
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== "all") {
        q = q.eq("status", status);
      }

      const { data, error } = await q;
      if (error) return jsonResponse(500, { error: error.message });

      await writeAudit({
        action_type: "superadmin.list_doctor_verifications",
        entity_type: "doctor_verification",
        details: { status, limit, offset },
      });

      return jsonResponse(200, { data: data ?? [], meta: { status, limit, offset } });
    }

    if (action === "get_doctor_verification") {
      const id = String(body?.id ?? "").trim();
      if (!id) return jsonResponse(400, { error: "Missing id" });

      const { data, error } = await authedClient
        .from("doctor_verification" as any)
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
        .from("doctor_verification_documents" as any)
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
      if (!serviceClient) return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

      const id = String(body?.id ?? "").trim();
      if (!id) return jsonResponse(400, { error: "Missing id" });

      const current = await serviceClient
        .from("doctor_verification" as any)
        .select("id, doctor_id, status")
        .eq("id", id)
        .maybeSingle();

      if (current.error) return jsonResponse(500, { error: current.error.message });
      if (!current.data) return jsonResponse(404, { error: "Not found" });

      const { error } = await serviceClient
        .from("doctor_verification" as any)
        .update({
          status: "verified",
          verification_status: "verified",
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (error) return jsonResponse(500, { error: error.message });

      await writeAudit({
        action_type: "superadmin.approve_doctor_verification",
        entity_type: "doctor_verification",
        entity_id: id,
        details: { doctor_id: (current.data as any).doctor_id },
      });

      return jsonResponse(200, { ok: true });
    }

    if (action === "reject_doctor_verification") {
      if (!serviceClient) return jsonResponse(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

      const id = String(body?.id ?? "").trim();
      const reason = String(body?.reason ?? "").trim();
      if (!id) return jsonResponse(400, { error: "Missing id" });
      if (!reason) return jsonResponse(400, { error: "Missing reason" });

      const current = await serviceClient
        .from("doctor_verification" as any)
        .select("id, doctor_id, status")
        .eq("id", id)
        .maybeSingle();

      if (current.error) return jsonResponse(500, { error: current.error.message });
      if (!current.data) return jsonResponse(404, { error: "Not found" });

      const { error } = await serviceClient
        .from("doctor_verification" as any)
        .update({
          status: "declined",
          verification_status: "declined",
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (error) return jsonResponse(500, { error: error.message });

      await writeAudit({
        action_type: "superadmin.reject_doctor_verification",
        entity_type: "doctor_verification",
        entity_id: id,
        details: { doctor_id: (current.data as any).doctor_id, reason },
      });

      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(400, { error: "Unknown action" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (msg === "unauthorized") return jsonResponse(401, { error: "Unauthorized" });
    if (msg === "forbidden") return jsonResponse(403, { error: "Forbidden" });
    return jsonResponse(500, { error: msg });
  }
});
