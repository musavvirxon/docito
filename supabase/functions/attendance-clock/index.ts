// File: supabase/functions/attendance-clock/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { secureHandler, jsonResponse, errorResponse } from "../_shared/security-middleware.ts";

type EntityType = "practice" | "lab" | "pharmacy" | "imaging_center";
type Action = "clock_in" | "clock_out";

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  userId?: string; // optional for admin marking someone else
  action: Action;
  at?: string; // ISO timestamp; default now
  notes?: string;
  isManual?: boolean;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function parseTime(iso?: string) {
  if (!iso) return new Date();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function minutesBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (60 * 1000)));
}

serve(async (req) => {
  const secured = await secureHandler(req, "attendance-clock", {
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
  const action = safeText((body as any)?.action) as Action;
  const targetUserId = safeText((body as any)?.userId) || user!.id;

  if (!entityType) return errorResponse("Missing entityType", 400);
  if (!entityId || !isUuid(entityId)) return errorResponse("Invalid entityId", 400);
  if (!targetUserId || !isUuid(targetUserId)) return errorResponse("Invalid userId", 400);
  if (action !== "clock_in" && action !== "clock_out") return errorResponse("Invalid action", 400);

  const at = parseTime((body as any)?.at);
  const notes = safeText((body as any)?.notes);
  const isManual = Boolean((body as any)?.isManual);

  // If acting on someone else, require admin-like access (we enforce via has_entity_access + role check)
  if (targetUserId !== user!.id) {
    const { data: roles, error: roleErr } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id);

    if (roleErr) return errorResponse(roleErr.message, 500);

    const roleSet = new Set((roles || []).map((r: any) => String(r.role)));
    const allowed = roleSet.has("super_admin") || roleSet.has("admin") || roleSet.has("practice_admin");
    if (!allowed) return errorResponse("Forbidden", 403);
  }

  // Find open shift
  const { data: openShift, error: openErr } = await serviceClient
    .from("staff_attendance_shifts")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("user_id", targetUserId)
    .is("clock_out_at", null)
    .maybeSingle();

  if (openErr) return errorResponse(openErr.message, 500);

  if (action === "clock_in") {
    if (openShift?.id) {
      return errorResponse("User already has an open shift", 409, "SHIFT_OPEN_EXISTS");
    }

    const shiftInsert = {
      entity_type: entityType,
      entity_id: entityId,
      user_id: targetUserId,
      clock_in_at: at.toISOString(),
      clock_out_at: null,
      duration_minutes: null,
      recorded_by: user!.id,
      is_manual: isManual,
      notes: notes || null,
    };

    const { data: inserted, error: insErr } = await serviceClient
      .from("staff_attendance_shifts")
      .insert(shiftInsert)
      .select("*")
      .single();

    if (insErr) return errorResponse(insErr.message, 500);

    await serviceClient.from("staff_attendance_events").insert({
      shift_id: inserted.id,
      entity_type: entityType,
      entity_id: entityId,
      user_id: targetUserId,
      event_type: "clock_in",
      event_at: at.toISOString(),
      actor_id: user!.id,
      before: null,
      after: inserted,
    });

    return jsonResponse({ ok: true, shift: inserted });
  }

  // clock_out
  if (!openShift?.id) {
    return errorResponse("No open shift found to clock out", 409, "NO_OPEN_SHIFT");
  }

  const before = openShift;

  const clockIn = new Date(openShift.clock_in_at);
  const durationMinutes = minutesBetween(clockIn, at);

  const patch = {
    clock_out_at: at.toISOString(),
    duration_minutes: durationMinutes,
    recorded_by: user!.id,
    is_manual: isManual || Boolean(openShift.is_manual),
    notes: notes || openShift.notes || null,
  };

  const { data: updated, error: updErr } = await serviceClient
    .from("staff_attendance_shifts")
    .update(patch)
    .eq("id", openShift.id)
    .select("*")
    .single();

  if (updErr) return errorResponse(updErr.message, 500);

  await serviceClient.from("staff_attendance_events").insert({
    shift_id: updated.id,
    entity_type: entityType,
    entity_id: entityId,
    user_id: targetUserId,
    event_type: "clock_out",
    event_at: at.toISOString(),
    actor_id: user!.id,
    before,
    after: updated,
  });

  return jsonResponse({ ok: true, shift: updated });
});
