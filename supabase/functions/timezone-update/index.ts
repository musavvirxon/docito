// Path: supabase/functions/timezone-update/index.ts
/**
 * Timezone Update Edge Function
 *
 * Supports:
 * - target=profile: update the authenticated user's profile timezone (doctors/patients/etc)
 * - target=entity: update an entity_settings timezone (facility) ONLY if not verified
 *
 * Enforcement:
 * - Facilities: blocked if entity_status is 'verified' OR entity_settings.timezone_locked is true
 * - Profiles: always allowed for the authenticated user
 *
 * Security:
 * - CORS
 * - Auth required
 * - Rate limiting + schema validation via secureHandler
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { secureHandler, jsonResponse } from "../_shared/security-middleware.ts";
import { validateUUID, validateString } from "../_shared/input-validator.ts";

type EntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy";
type Target = "profile" | "entity";

type ReqBody = {
  action: "set";
  target: Target;
  timezone: string;
  source?: "browser" | "ip" | "manual" | "verification" | "admin";
  entityType?: EntityType;
  entityId?: string;
};

type ScopeRow = {
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  entity_status: string | null;
  scope_role: string | null;
  is_admin: boolean;
  permissions: Record<string, unknown> | null;
};

type Resp =
  | {
      ok: true;
      target: Target;
      timezone: string;
      timezone_source: string;
      timezone_locked: boolean;
      timezone_updated_at: string | null;
      entity?: { entity_type: EntityType; entity_id: string; entity_status: string | null } | null;
    }
  | { ok: false; error: string; code?: string };

const updateSchema = {
  action: { type: "string" as const, required: true, enum: ["set"] as const },
  target: { type: "string" as const, required: true, enum: ["profile", "entity"] as const },
  timezone: { type: "string" as const, required: true, minLength: 1, maxLength: 100, trim: true, sanitize: true },
  source: {
    type: "string" as const,
    required: false,
    enum: ["browser", "ip", "manual", "verification", "admin"] as const,
    trim: true,
    sanitize: true,
  },
  entityType: {
    type: "string" as const,
    required: false,
    enum: ["practice", "clinic", "lab", "imaging", "pharmacy"] as const,
    trim: true,
    sanitize: true,
  },
  entityId: { type: "uuid" as const, required: false },
};

function json(data: Resp, status = 200): Response {
  return jsonResponse(data, status);
}

function isValidIanaTimezone(tz: string): boolean {
  const cleaned = tz.trim();
  if (!cleaned || cleaned.length > 100) return false;
  if (/\s/.test(cleaned)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: cleaned }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeSource(input?: string): "browser" | "ip" | "manual" | "verification" | "admin" {
  const v = String(input || "manual").trim().toLowerCase();
  if (v === "browser" || v === "ip" || v === "verification" || v === "admin") return v;
  return "manual";
}

function normalizeEntityType(input: unknown): EntityType | null {
  const v = validateString(input, 1, 24);
  if (!v) return null;
  const t = v.toLowerCase();
  if (t === "practice" || t === "clinic" || t === "lab" || t === "imaging" || t === "pharmacy") return t;
  return null;
}

serve(async (req) => {
  const { response, context, validatedBody } = await secureHandler(req, "timezone-update", {
    rateLimit: "standard",
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
    validationSchema: updateSchema,
    logRequests: false,
  });

  if (response) return response;
  if (!context || !validatedBody) return json({ ok: false, error: "Internal server error" }, 500);

  try {
    const body = validatedBody as ReqBody;
    const { user, userId, roles, supabase, serviceClient } = context;

    if (!user || !userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const timezone = validateString(body.timezone, 1, 100);
    if (!timezone) return json({ ok: false, error: "Invalid timezone" }, 400);
    if (!isValidIanaTimezone(timezone)) return json({ ok: false, error: "Invalid IANA timezone" }, 400);

    const timezone_source = normalizeSource(body.source);

    if (body.target === "profile") {
      const { data, error } = await serviceClient
        .from("profiles")
        .update({
          timezone,
          timezone_source,
          timezone_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", userId)
        .select("timezone, timezone_source, timezone_locked, timezone_updated_at")
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ ok: false, error: "Profile not found" }, 404);

      return json({
        ok: true,
        target: "profile",
        timezone: data.timezone ?? timezone,
        timezone_source: data.timezone_source ?? timezone_source,
        timezone_locked: Boolean(data.timezone_locked ?? false),
        timezone_updated_at: data.timezone_updated_at ?? null,
        entity: null,
      });
    }

    // entity target
    const entityType = normalizeEntityType(body.entityType);
    const entityId = validateUUID(body.entityId);
    if (!entityType || !entityId) return json({ ok: false, error: "Missing/invalid entityType or entityId" }, 400);

    const isSuperAdmin = roles.includes("super_admin");

    // Verify membership + status using get_my_entity_scopes unless super_admin
    let status: string | null = null;

    if (!isSuperAdmin) {
      const { data: scopesData, error: scopesErr } = await supabase.rpc("get_my_entity_scopes");
      if (scopesErr) throw scopesErr;

      const scopes = (scopesData || []) as ScopeRow[];
      const scope = scopes.find(
        (s) => String(s.entity_type || "").toLowerCase() === entityType && String(s.entity_id || "") === entityId,
      );

      if (!scope) return json({ ok: false, error: "Forbidden" }, 403);

      status = (scope.entity_status || null) ? String(scope.entity_status).toLowerCase() : null;

      if (status === "verified") {
        return json({ ok: false, error: "Timezone cannot be changed after verification", code: "TIMEZONE_LOCKED" }, 403);
      }
    }

    // Check row lock flag (even pre-verification)
    const { data: existing, error: selErr } = await serviceClient
      .from("entity_settings")
      .select("timezone_locked, timezone_source, timezone_updated_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (selErr) throw selErr;

    if (existing?.timezone_locked === true) {
      return json({ ok: false, error: "Timezone is locked", code: "TIMEZONE_LOCKED" }, 403);
    }

    const { data: upserted, error: upErr } = await serviceClient
      .from("entity_settings")
      .upsert(
        {
          entity_type: entityType,
          entity_id: entityId,
          timezone,
          timezone_source,
          timezone_locked: false,
          timezone_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "entity_type,entity_id" },
      )
      .select("entity_type, entity_id, timezone, timezone_source, timezone_locked, timezone_updated_at")
      .single();

    if (upErr) throw upErr;

    return json({
      ok: true,
      target: "entity",
      timezone: upserted.timezone ?? timezone,
      timezone_source: upserted.timezone_source ?? timezone_source,
      timezone_locked: Boolean(upserted.timezone_locked ?? false),
      timezone_updated_at: upserted.timezone_updated_at ?? null,
      entity: { entity_type: entityType, entity_id: entityId, entity_status: status },
    });
  } catch (e: any) {
    console.error("timezone-update error:", e);
    const msg = e?.message || "Unknown error";
    if (String(msg).toLowerCase().includes("timezone is locked")) {
      return json({ ok: false, error: "Timezone is locked", code: "TIMEZONE_LOCKED" }, 403);
    }
    return json({ ok: false, error: msg }, 500);
  }
});
