// File: supabase/functions/staff-management/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "practice" | "pharmacy" | "lab" | "imaging_center";

type StaffManagementRequest =
  | {
      action: "get_invite";
      token: string;
    }
  | {
      action: "create_invite";
      entityType: EntityType;
      entityId: string;
      email: string;
      fullName?: string;
      phone?: string;
      role: string;
      customMessage?: string;
      permissions?: Record<string, unknown>;
      sendEmail?: boolean;
      platformUrl?: string;
    }
  | {
      action: "list_invites";
      entityType: EntityType;
      entityId: string;
    }
  | {
      action: "cancel_invite";
      entityType: EntityType;
      entityId: string;
      invitationId: string;
    }
  | {
      action: "list_staff";
      entityType: EntityType;
      entityId: string;
    }
  | {
      action: "update_staff";
      entityType: EntityType;
      entityId: string;
      staffId: string;
      updates: Record<string, unknown>;
    };

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function badRequest(message: string, details?: unknown) {
  return json({ error: message, details }, 400);
}

function unauthorized(message = "Unauthorized") {
  return json({ error: message }, 401);
}

function forbidden(message = "Forbidden") {
  return json({ error: message }, 403);
}

function requireEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function getAuthedUser(req: Request, supabaseUrl: string, anonKey: string): Promise<User> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Missing authorization token");

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error("Invalid token");
  return data.user;
}

async function isSuperAdmin(service: any, userId: string) {
  const { data, error } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

async function isEntityAdmin(
  service: any,
  entityType: EntityType,
  entityId: string,
  userId: string,
) {
  const table =
    entityType === "practice"
      ? "practices"
      : entityType === "pharmacy"
      ? "pharmacies"
      : entityType === "lab"
      ? "lab_centers"
      : "imaging_centers";

  const { data, error } = await service
    .from(table)
    .select("admin_id")
    .eq("id", entityId)
    .maybeSingle();
  if (error || !data) return false;
  return (data as any).admin_id === userId;
}

function staffTable(entityType: EntityType) {
  switch (entityType) {
    case "practice":
      return "clinic_staff";
    case "pharmacy":
      return "pharmacy_staff";
    case "lab":
      return "lab_staff";
    case "imaging_center":
      return "imaging_staff";
  }
}

function staffEntityColumn(entityType: EntityType) {
  switch (entityType) {
    case "practice":
      return "practice_id";
    case "pharmacy":
      return "pharmacy_id";
    case "lab":
      return "lab_center_id";
    case "imaging_center":
      return "imaging_center_id";
  }
}

function sanitizeStaffUpdates(entityType: EntityType, updates: Record<string, unknown>) {
  const allowed = new Set<string>(["staff_role", "status"]);
  if (entityType === "practice") {
    [
      "can_book_appointments",
      "can_view_medical_records",
      "can_manage_billing",
      "can_manage_patients",
      "can_view_schedule",
      "department",
    ].forEach((k) => allowed.add(k));
  }
  if (entityType === "pharmacy") {
    ["can_dispense", "can_manage_inventory", "can_process_prescriptions", "license_number"].forEach((k) =>
      allowed.add(k),
    );
  }
  if (entityType === "lab") {
    [
      "can_process_samples",
      "can_upload_results",
      "can_verify_results",
      "can_manage_equipment",
      "license_number",
      "specializations",
    ].forEach((k) => allowed.add(k));
  }
  if (entityType === "imaging_center") {
    [
      "license_number",
      "specializations",
      "can_view_orders",
      "can_process_scans",
      "can_upload_results",
      "can_verify_results",
      "can_manage_equipment",
    ].forEach((k) => allowed.add(k));
  }

  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates || {})) {
    if (!allowed.has(k)) continue;
    cleaned[k] = v;
  }
  return cleaned;
}

async function maybeSendInviteEmail(args: {
  to: string;
  inviteUrl: string;
  inviteeName: string;
  entityName: string;
  inviterName: string;
  role: string;
  customMessage?: string;
}) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;

  const subject = `You're invited to join ${args.entityName}`;
  const html = `
    <div style="font-family:Arial,sans-serif; line-height:1.5">
      <h2>Staff Invitation</h2>
      <p>Hi ${args.inviteeName || "there"},</p>
      <p>${args.inviterName || "An admin"} invited you to join <b>${args.entityName}</b> as <b>${args.role}</b>.</p>
      ${args.customMessage ? `<p style="margin-top:12px"><i>\"${args.customMessage}\"</i></p>` : ""}
      <p style="margin-top:16px">
        <a href="${args.inviteUrl}" style="display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none;">Accept Invitation</a>
      </p>
      <p>If the button doesn't work, copy/paste:</p>
      <p>${args.inviteUrl}</p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Staff Invitations <onboarding@resend.dev>",
      to: [args.to],
      subject,
      html,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = (await req.json().catch(() => null)) as StaffManagementRequest | null;
    if (!body || typeof (body as any).action !== "string") return badRequest("Missing action");

    // Public read of an invite by token (safe due to high-entropy token)
    if (body.action === "get_invite") {
      const token = (body.token || "").trim();
      if (!token) return badRequest("Missing token");

      const { data, error } = await service
        .from("staff_invitations")
        .select(
          "id, entity_type, entity_id, email, phone, full_name, role, status, invite_type, invite_token, expires_at, created_at",
        )
        .eq("invite_token", token)
        .maybeSingle();

      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ invite: null }, 200);
      return json({ invite: data }, 200);
    }

    let user: User;
    try {
      user = await getAuthedUser(req, supabaseUrl, anonKey);
    } catch (e: any) {
      return unauthorized(e?.message || "Unauthorized");
    }

    const superAdmin = await isSuperAdmin(service, user.id);
    const entityType = (body as any).entityType as EntityType | undefined;
    const entityId = (body as any).entityId as string | undefined;

    if (!entityType || !entityId) return badRequest("Missing entityType/entityId");

    const admin = superAdmin || (await isEntityAdmin(service, entityType, entityId, user.id));
    if (!admin) return forbidden("Only entity admins can manage staff");

    if (body.action === "create_invite") {
      const email = body.email?.trim().toLowerCase();
      if (!email || !email.includes("@")) return badRequest("Invalid email");
      if (!body.role) return badRequest("Missing role");

      const { data: existingProfile } = await service
        .from("profiles")
        .select("user_id, full_name")
        .eq("email", email)
        .maybeSingle();

      const inviteType = existingProfile?.user_id ? "existing_user" : "new_user";
      const status = existingProfile?.user_id ? "pending" : "awaiting_signup";

      const { data: invite, error: inviteError } = await service
        .from("staff_invitations")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          invited_user_id: existingProfile?.user_id ?? null,
          email,
          phone: body.phone ?? null,
          full_name: body.fullName ?? null,
          role: body.role,
          custom_message: body.customMessage ?? null,
          status,
          invite_type: inviteType,
          invited_by: user.id,
        })
        .select(
          "id, invite_token, status, expires_at, email, role, entity_type, entity_id, created_at",
        )
        .single();

      if (inviteError) {
        return json({ error: inviteError.message, code: (inviteError as any).code }, 400);
      }

      const sendEmail = body.sendEmail !== false;
      if (sendEmail) {
        const platformUrl = body.platformUrl || Deno.env.get("FRONTEND_URL") || "";
        const inviteUrl = `${platformUrl || ""}/accept-invite/${invite.invite_token}`;

        let entityName = "Organization";
        const entityTable =
          entityType === "practice"
            ? "practices"
            : entityType === "pharmacy"
            ? "pharmacies"
            : entityType === "lab"
            ? "lab_centers"
            : "imaging_centers";
        const { data: entityRow } = await service.from(entityTable).select("name").eq("id", entityId).maybeSingle();
        if (entityRow?.name) entityName = entityRow.name;

        const { data: inviterProfile } = await service
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        await maybeSendInviteEmail({
          to: email,
          inviteUrl,
          inviteeName: body.fullName || existingProfile?.full_name || "there",
          entityName,
          inviterName: inviterProfile?.full_name || "Admin",
          role: body.role,
          customMessage: body.customMessage,
        }).catch(() => void 0);
      }

      return json({ invite });
    }

    if (body.action === "list_invites") {
      const { data, error } = await service
        .from("staff_invitations")
        .select(
          "id, email, full_name, phone, role, status, invite_type, invite_token, expires_at, created_at",
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) return json({ error: error.message }, 400);
      return json({ invitations: data || [] });
    }

    if (body.action === "cancel_invite") {
      if (!body.invitationId) return badRequest("Missing invitationId");
      const { error } = await service
        .from("staff_invitations")
        .delete()
        .eq("id", body.invitationId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (body.action === "list_staff") {
      const table = staffTable(entityType);
      const entityCol = staffEntityColumn(entityType);

      const { data: staffRows, error: staffErr } = await service
        .from(table)
        .select("*")
        .eq(entityCol, entityId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (staffErr) return json({ error: staffErr.message }, 400);

      const userIds = Array.from(new Set((staffRows || []).map((s: any) => s.user_id).filter(Boolean)));
      let profiles: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await service
          .from("profiles")
          .select("user_id, full_name, first_name, last_name, email")
          .in("user_id", userIds);
        for (const p of profs || []) profiles[(p as any).user_id] = p;
      }

      return json({ staff: staffRows || [], profiles });
    }

    if (body.action === "update_staff") {
      if (!body.staffId) return badRequest("Missing staffId");
      const cleaned = sanitizeStaffUpdates(entityType, body.updates);
      if (!Object.keys(cleaned).length) return badRequest("No valid updates");

      const table = staffTable(entityType);
      const entityCol = staffEntityColumn(entityType);

      const { data, error } = await service
        .from(table)
        .update(cleaned)
        .eq("id", body.staffId)
        .eq(entityCol, entityId)
        .select("*")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ staff: data });
    }

    return badRequest("Unknown action");
  } catch (e: any) {
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
